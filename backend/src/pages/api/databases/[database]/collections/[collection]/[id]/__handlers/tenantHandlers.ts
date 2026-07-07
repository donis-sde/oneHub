/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Tenant, TenantDto, tenantSchema } from '@/dataAccess/models/Tenant';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import {
  isMongooseExtendedType,
  MongooseExtendedType,
  MongooseExtendedTypeEnum,
} from '@/types/MongooseExtendedTypes';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import mongoose from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
import { HttpErrorResponse } from '@/types/HttpErrorResponse';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

export type GetTenantResponse = TenantDto | null;
export type UpdateTenantResponse = TenantDto | null;

type TenantResponse =
  | UpdateTenantResponse
  | GetTenantResponse
  | HttpErrorResponse;

export const tenantHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<TenantResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<TenantResponse>([
    createLogContextMiddleware(),
    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.PATCH,
          roles: [Role.ADMIN],
        },
        {
          httpMethod: HttpMethod.GET,
          roles: [Role.ADMIN],
        },
      ],
      BackofficeFeature.MT_TENANT,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<TenantResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'tenantHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });

        return patchTenantHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });

        return getTenantHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfTenant = (v: string): v is keyof Tenant => {
  return !!tenantSchema.paths[v];
};

const getTenantHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTenantResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTenantHandler',
  };

  const { tenantDao } = await getServerDiContainer();
  const { id } = req.query;

  logger.debug('params', {
    params: {
      id,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  if (typeof id !== 'string') {
    throw new Error('bad_request');
  }

  const tenant = await tenantDao.get(id);

  logger.debug('tenant', {
    tenant: JSON.parse(JSON.stringify(tenant)),
    loggerMetadata: clonedLoggerMetadata,
  });

  if (!tenant) {
    return res.status(404).json({ err: 'no_tenant' });
  }

  res.status(200).json(tenant);
};

export const patchTenantHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateTenantResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchTenantHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfTenant(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchTenantHandler:bad_request', {
        params: {
          id,
          type,
          field,
          newValue: newValueSanitized,
        },
        loggerMetadata: clonedLoggerMetadata,
      });

      throw new Error('bad_request');
    }
    logger.info('params', {
      params: {
        id,
        type,
        field,
        newValue: newValueSanitized,
      },
      loggerMetadata: clonedLoggerMetadata,
    });
    const { tenantDao } = await getServerDiContainer();
    const recordsToBeUpdated = await tenantDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'tenant-single-recordstobeupdate',
    );
    const tenant = await updateTenant(
      id,
      field,
      type,
      newValueSanitized,
      logger,
      loggerMetadata,
    );
    const { backofficeDbUpdateLogsDao } = await getServerDiContainer();
    const logData: Partial<IBackofficeDbUpdateLogs>[] = [
      {
        impactedRecordObjectId: JSON.stringify(id),
        tenantId: recordsToBeUpdated?.TenantId,
        impactedRecordEmail: recordsToBeUpdated?.ClientEmail,
        oldValue: JSON.stringify(
          recordsToBeUpdated?.[field as keyof TenantDto],
        ),
        collectionName: process.env.NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
        dbName: process.env.MT_DB_NAME,
        changedBy: loggerMetadata.userContext?.email,
        fieldChanged: field,
        filterUsed: 'updated without using filter',
        newValue: JSON.stringify(newValueSanitized),
        timestamp: new Date(),
      },
    ];
    const response = await backofficeDbUpdateLogsDao.insertMany(logData);
    logger.info('tenant', {
      tenant: JSON.parse(JSON.stringify(tenant)),
      loggerMetadata: clonedLoggerMetadata,
    });

    if (!tenant) {
      return applyResponse({ status: 404, response: null })(res);
    }

    const httpResponse: HttpResponse<UpdateTenantResponse> = {
      response: tenant,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updateTenant = async (
  id: string,
  field: keyof Tenant,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateTenantResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTenant',
  };

  const { tenantDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const tenant = (async (): Promise<Tenant> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await tenantDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await tenantDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await tenantDao.updateField(id, field, JSON.parse(newValue));
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await tenantDao.updateField(id, field, JSON.parse(newValue));
      } else {
        return await tenantDao.updateField(id, field, newValue);
      }
    }
  })();

  return tenant;
};
