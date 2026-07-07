// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { HttpMethod } from '@/enums/HttpMethod';
import { getServerDiContainer } from '@/global/serverDiContainer';
import winston from 'winston';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import {
  RegisterCloudAPIDto,
  isRegisterCloudAPIDto,
} from '@/types/RegisterCloudAPI';
import { Collection, Document, ObjectId } from 'mongodb';
import { TenantDao } from '@/dataAccess/TenantDao';
import { getEnv } from '@/utils/getEnv';
import { Tenant } from '@/dataAccess/models/Tenant';
import { generatePin, isValidPin, registerPhone, subscribeApp } from './utils';

export type RegisterCloudAPIResponse = { result: object | null };

const insertAuditLog = async (
  subId: string,
  message: string,
  isSuccess: boolean,
): Promise<void> => {
  const { logger, registerCloudAPIAuditLogCollection } =
    await getServerDiContainer();
  const auditLog = {
    subId,
    message,
    isSuccess,
    timestamp: new Date(),
  };
  await registerCloudAPIAuditLogCollection.insertOne(auditLog);
};

const updateWatiRoute =
  (
    tenantId: ObjectId,
    backendUrl: string,
    frontendUrl: string,
    phoneId: string,
    wabaId: string | null,
  ) =>
  async (watiRouteCollection: Collection): Promise<Document> => {
    const route = await watiRouteCollection.findOne({
      serverUrl: backendUrl,
    });

    if (route) {
      route['phoneNumberId'] = phoneId;
      route['wabaId'] = wabaId;
      await watiRouteCollection.updateOne(
        {
          _id: route._id,
        },
        {
          $set: route,
        },
      );

      return route;
    } else {
      const newRoute = {
        tenantId: tenantId.toString(),
        phoneNumberId: phoneId,
        wabaId,
        frontendUrl: frontendUrl,
        serverUrl: backendUrl,
      };

      const insertResult = await watiRouteCollection.insertOne(newRoute);
      return {
        ...newRoute,
        _id: insertResult.insertedId,
      };
    }
  };

const watiAssign = async (
  tenant: Tenant,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
    ...loggerMetadata,
    functionName: 'watiAssign',
  };
  const { FB_SYSTEM_TOKEN, CLARE_SECRET_KEY } = getEnv();

  const serverUrl = `https://${tenant?.BackendDomain?.replace('https://', '')}`;
  const url = `${serverUrl}/api/v1/config/updateCloudApi`;
  logger.info(url, {
    loggerMetadata: clonedLoggerMetadata,
  });

  const body = {
    WABA_ID: tenant.WABAID,
    PhoneNumberId: tenant.WABAPhoneInfo?.id,
    StripeCustomerId: tenant.StripeCustomerId,
    StripeSubscriptionId: tenant.StripeSubscriptionId,
    AddAdminAccount: true,
    WatiAdminEmail: tenant.ClientEmail,
    WatiAdminPassword: tenant.WATIAdminPassword,
    WatiAdminFirstName: tenant.ClientFirstName,
    WatiAdminLastName: tenant.ClientLastName,
    WatiAdminPhoneNumber: tenant.ClientPhone,
    PaymentType: tenant.PaymentType,
    MaxNumberOperators: tenant.MaxNumberOperators,
    ProPlan: tenant.ProPlan,
    DisplayName: tenant.WADisplayName,
    FacebookSystemUserToken: FB_SYSTEM_TOKEN,
  };

  const headers = {
    'Content-Type': 'application/json',
    Authorization: CLARE_SECRET_KEY,
  };

  const response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  });
  const responseBody = await response.json();

  logger.info(`watiAssign response ${responseBody}`, {
    loggerMetadata: clonedLoggerMetadata,
  });
};

const registerApi =
  (
    dto: RegisterCloudAPIDto,
    logger: winston.Logger,
    loggerMetadata: BackofficePortalLoggingMetadata,
  ) =>
  async (
    tenantDao: TenantDao,
    webhookEventWabaCollection: Collection,
    watiRouteCollection: Collection,
  ): Promise<[boolean, string]> => {
    const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
      ...loggerMetadata,
      functionName: 'registerApi',
    };

    const subId = dto.subId;

    try {
      const tenants = await tenantDao.getByFilter({
        StripeSubscriptionId: subId,
      });
      const tenant = tenants?.[0];
      if (!tenant) {
        throw new Error(`subscription ${subId} not found`);
      }

      const tenantId = tenant._id;
      const phoneId = tenant.WABAPhoneInfo?.id;
      const wabaId = tenant.WABAID;
      const backendDomain = `https://${tenant?.BackendDomain?.replace(
        'https://',
        '',
      )}`;
      const frontendDomain = `https://${tenant?.FrontEndUrl?.replace(
        'https://',
        '',
      )}`;

      logger.info(
        `backend: ${backendDomain} phone info: ${tenant.WABAPhoneInfo}`,
        {
          loggerMetadata: clonedLoggerMetadata,
        },
      );

      if (!phoneId) {
        throw new Error(`phone_id cannot by empty`);
      }

      let pin = tenant.WABAPhoneInfo?.pin;
      if (!isValidPin(pin)) {
        pin = generatePin();
      }

      await updateWatiRoute(
        tenantId,
        backendDomain,
        frontendDomain,
        phoneId,
        wabaId,
      )(watiRouteCollection);

      const result = await registerPhone(
        phoneId,
        pin,
        logger,
        clonedLoggerMetadata,
      );

      await watiAssign(tenant, logger, clonedLoggerMetadata);

      await subscribeApp(wabaId, logger, clonedLoggerMetadata);

      await insertAuditLog(subId, result[1], result[0]);

      return result;
    } catch (error) {
      await insertAuditLog(subId, String(error), false);
      throw error;
    }
  };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegisterCloudAPIResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<RegisterCloudAPIResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: null,
          },
        ],
        BackofficeFeature.REGISTER_CLOUD_API,
      ),
      async (
        req: NextApiRequest,
        res: NextApiResponse<RegisterCloudAPIResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'RegisterCloudAPI',
        };

        logger.debug('body', {
          body: req.body,
          loggerMetadata,
        });
        if (!isRegisterCloudAPIDto(req.body)) {
          throw new Error('bad_request');
        }

        const { tenantDao, webhookEventWabaCollection, watiRouteCollection } =
          await getServerDiContainer();
        const registerResult = await registerApi(
          req.body,
          logger,
          loggerMetadata,
        )(tenantDao, webhookEventWabaCollection, watiRouteCollection);

        res.status(200).json({ result: registerResult });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/registerCloudAPI/register:error', { err: `${err}` });

    res.status(500).json({ result: null });
  }
}
