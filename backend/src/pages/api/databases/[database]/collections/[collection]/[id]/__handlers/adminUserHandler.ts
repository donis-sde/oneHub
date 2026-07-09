/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AdminUser, adminUserSchema } from '@/dataAccess/models/AdminUser';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { HttpErrorResponse } from '@/types/HttpErrorResponse';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import {
  isMongooseExtendedType,
  MongooseExtendedType,
  MongooseExtendedTypeEnum,
} from '@/types/MongooseExtendedTypes';
import { AdminUserDto } from '@/types/User';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import mongoose from 'mongoose';
import type { NextApiRequest, NextApiResponse } from 'next';
// import { omit } from 'ramda';
import winston from 'winston';

export type GetAdminUserResponse = {
  adminUser: AdminUserDto | null;
};
export type UpdateAdminUserResponse = AdminUserDto | null;
type AdminUserResponse =
  | GetAdminUserResponse
  | UpdateAdminUserResponse
  | HttpErrorResponse;

export const adminUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<AdminUserResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<AdminUserResponse>([
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
      BackofficeFeature.USER_ROLE_UPDATE,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<AdminUserResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'adminUserHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });
        return patchAdminUserHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getAdminUserHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfAdminUser = (v: string): v is keyof AdminUser => {
  return !!adminUserSchema.paths[v];
};

const getAdminUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetAdminUserResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getAdminUserHandler',
  };

  const { adminUserDao } = await getServerDiContainer();
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

  const adminUser = await adminUserDao.get(id);

  logger.debug('adminUser', {
    adminUser,
    loggerMetadata: clonedLoggerMetadata,
  });

  res.status(200).json({ adminUser });
};

const patchAdminUserHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateAdminUserResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchAdminUserHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfAdminUser(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchAdminUserHandler:bad_request', {
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
    const { adminUserDao } = await getServerDiContainer();
    const recordsToBeUpdated = await adminUserDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'admin-user-single-recordstobeupdate',
    );
    const adminUser = await updateAdminUser(
      id,
      field,
      type,
      newValueSanitized,
      logger,
      clonedLoggerMetadata,
    );
    const { backofficeDbUpdateLogsDao } = await getServerDiContainer();
    const logData: Partial<IBackofficeDbUpdateLogs>[] = [
      {
        impactedRecordObjectId: JSON.stringify(id),
        tenantId: 'N/A',
        impactedRecordEmail: recordsToBeUpdated?.email,
        oldValue: JSON.stringify(
          recordsToBeUpdated?.[field as keyof AdminUserDto],
        ),
        collectionName: process.env.NEXT_PUBLIC_DB_AUTH_DATABASE,
        dbName: process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
        changedBy: loggerMetadata.userContext?.email,
        fieldChanged: field,
        filterUsed: 'updated without using filter',
        newValue: JSON.stringify(newValueSanitized),
        timestamp: new Date(),
      },
    ];
    const response = await backofficeDbUpdateLogsDao.insertMany(logData);

    logger.info('adminUser', {
      adminUser: JSON.parse(JSON.stringify(adminUser)),
      loggerMetadata: clonedLoggerMetadata,
    });

    if (!adminUser) {
      return applyResponse({ response: null, status: 404 })(res);
    }

    const httpResponse: HttpResponse<UpdateAdminUserResponse> = {
      response: adminUser,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    logger.error('error', {
      error: err,
      loggerMetadata: clonedLoggerMetadata,
    });

    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updateAdminUser = async (
  id: string,
  field: keyof AdminUser,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateAdminUserResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateAdminUser',
  };

  const { adminUserDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const adminUser = await (async (): Promise<AdminUser> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await adminUserDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await adminUserDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await adminUserDao.updateField(id, field, JSON.parse(newValue));
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await adminUserDao.updateField(id, field, JSON.parse(newValue));
      } else {
        return await adminUserDao.updateField(id, field, newValue);
      }
    }
  })();

  return adminUser;
};
