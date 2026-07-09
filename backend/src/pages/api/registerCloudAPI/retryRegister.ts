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
import { Collection, Document, ObjectId, WithId } from 'mongodb';
import { TenantDao } from '@/dataAccess/TenantDao';
import { generatePin, isValidPin, registerPhone, subscribeApp } from './utils';

export type RetryRegisterCloudAPIResponse = { result: boolean | null };

const registerCloudApi =
  (
    tenants: WithId<Document>[],
    logger: winston.Logger,
    loggerMetadata: BackofficePortalLoggingMetadata,
  ) =>
  async (
    tenantDao: TenantDao,
    webhookEventWabaCollection: Collection,
  ): Promise<void> => {
    const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
      ...loggerMetadata,
      functionName: 'registerCloudApi',
    };

    let index = 1;
    for (const tenant of tenants) {
      const tenantDocs = await tenantDao.getByFilter({ WABAID: tenant.WABAID });

      if (!tenantDocs) {
        continue;
      }

      for (const tenantDoc of tenantDocs) {
        if (tenantDoc?.['GatewayType'] !== 'CLOUD_API') {
          logger.info(
            `ignore register_cloud_api ${index} ${tenantDoc.Created} ${tenantDoc.WABAID}`,
            {
              loggerMetadata: clonedLoggerMetadata,
            },
          );
          index++;
          continue;
        }

        if (!tenantDoc?.WABAPhoneInfo?.id) {
          continue;
        }

        const phoneId = tenantDoc.WABAPhoneInfo?.id;
        let pin = tenantDoc.WABAPhoneInfo?.pin;

        logger.info(
          `register_cloud_api ${index} ${tenantDoc.Created} ${tenantDoc.GatewayType}`,
          {
            loggerMetadata: clonedLoggerMetadata,
          },
        );

        if (!phoneId) {
          logger.error(`phone_id cannot by empty`, {
            loggerMetadata: clonedLoggerMetadata,
          });
          continue;
        }

        if (!isValidPin(pin)) {
          pin = generatePin();
        }

        index++;

        await registerPhone(phoneId, pin, logger, clonedLoggerMetadata);

        await subscribeApp(tenantDoc.WABAID, logger, clonedLoggerMetadata);
      }

      await updateWebhookIsRegistered(tenant._id)(webhookEventWabaCollection);
    }
  };

const updateWebhookIsRegistered =
  (tenantId: ObjectId) =>
  async (webhookEventWabaCollection: Collection): Promise<void> => {
    await webhookEventWabaCollection.updateOne(
      { _id: tenantId },
      { $set: { IsRegistered: true } },
    );
  };

const registerAccountsReinstate =
  (logger: winston.Logger, loggerMetadata: BackofficePortalLoggingMetadata) =>
  async (
    tenantDao: TenantDao,
    webhookEventWabaCollection: Collection,
  ): Promise<void> => {
    const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
      ...loggerMetadata,
      functionName: 'registerAccountsReinstate',
    };

    const docs = await webhookEventWabaCollection
      .find(
        {
          'payload.value.ban_info.waba_ban_state': 'REINSTATE',
          IsRegistered: {
            $ne: true,
          },
        },
        { sort: { createdAt: -1 } },
      )
      .toArray();

    registerCloudApi(
      docs,
      logger,
      clonedLoggerMetadata,
    )(tenantDao, webhookEventWabaCollection);
  };

const registerAccountsApproved =
  (logger: winston.Logger, loggerMetadata: BackofficePortalLoggingMetadata) =>
  async (
    tenantDao: TenantDao,
    webhookEventWabaCollection: Collection,
  ): Promise<void> => {
    const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
      ...loggerMetadata,
      functionName: 'registerAccountsApproved',
    };

    const docs = await webhookEventWabaCollection
      .find(
        {
          $and: [
            { 'payload.field': 'phone_number_name_update' },
            { 'payload.value.decision': 'APPROVED' },
            { IsRegistered: { $ne: true } },
          ],
        },
        { sort: { createdAt: -1 } },
      )
      .toArray();

    registerCloudApi(
      docs,
      logger,
      clonedLoggerMetadata,
    )(tenantDao, webhookEventWabaCollection);
  };

const retryRegisterApi =
  (logger: winston.Logger, loggerMetadata: BackofficePortalLoggingMetadata) =>
  async (
    tenantDao: TenantDao,
    webhookEventWabaCollection: Collection,
  ): Promise<void> => {
    const clonedLoggerMetadata: BackofficePortalLoggingMetadata = {
      ...loggerMetadata,
      functionName: 'retryRegisterApi',
    };

    registerAccountsReinstate(logger, clonedLoggerMetadata)(
      tenantDao,
      webhookEventWabaCollection,
    );

    registerAccountsApproved(logger, clonedLoggerMetadata)(
      tenantDao,
      webhookEventWabaCollection,
    );

    return;
  };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RetryRegisterCloudAPIResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<RetryRegisterCloudAPIResponse>([
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
        res: NextApiResponse<RetryRegisterCloudAPIResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'RegisterCloudAPI',
        };

        const { tenantDao, webhookEventWabaCollection } =
          await getServerDiContainer();
        await retryRegisterApi(logger, loggerMetadata)(
          tenantDao,
          webhookEventWabaCollection,
        );

        res.status(200).json({ result: true });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/registerCloudAPI/retryRegister:error', {
      err: `${err}`,
    });

    res.status(500).json({ result: null });
  }
}
