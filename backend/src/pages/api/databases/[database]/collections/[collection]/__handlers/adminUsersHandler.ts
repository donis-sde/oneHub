/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AdminUser, AdminUserDto } from '@/dataAccess/models/AdminUser';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Paginated, Paginator } from '@/types/Pagination';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { WithId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UpdateCollectionsResponse } from '..';
import { isKeyOfAdminUser } from '../[id]/__handlers/adminUserHandler';
import {
  MongooseExtendedType,
  MongooseExtendedTypeEnum,
  isMongooseExtendedType,
} from '@/types/MongooseExtendedTypes';
import { FilterCriteria } from '@/types/FilterCriteria';
import {
  filterQueryParamsParser,
  parseFilterObject,
} from '@/utils/mongooseUtils';
import mongoose, { Condition } from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

export type GetAdminUsersResponse = Paginated<WithId<AdminUserDto>>;

export const adminUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetAdminUsersResponse | UpdateCollectionsResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<GetAdminUsersResponse | UpdateCollectionsResponse>([
    createLogContextMiddleware(),
    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.GET,
          roles: [Role.ADMIN],
        },
        {
          httpMethod: HttpMethod.POST,
          roles: [Role.ADMIN],
        },
      ],
      BackofficeFeature.USER_ROLE_UPDATE,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<GetAdminUsersResponse | UpdateCollectionsResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'adminUsersHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getAdminUsersHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', {
          loggerMetadata,
        });
        return updateAdminUsersHandler(req, res, logger, loggerMetadata);
      } else {
        logger.error('unsupported request type', {
          method: req.method,
        });
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getAdminUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetAdminUsersResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getAdminUsersHandler',
  };

  const {
    skip: skipRaw = '0',
    limit: limitRaw = '25',
    database: _database,
    collection: _collection,
    ...otherQuery
  } = req.query;
  const skip = typeof skipRaw === 'string' ? parseInt(skipRaw) : null;
  const limit = typeof limitRaw === 'string' ? parseInt(limitRaw) : null;

  logger.debug('params', {
    params: {
      skip,
      limit,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  if (skip === null || limit === null || isNaN(skip) || isNaN(limit)) {
    throw new Error('bad_request');
  }

  const filter = filterQueryParamsParser(otherQuery);

  logger.debug('filter', {
    filter: filter,
    loggerMetadata: clonedLoggerMetadata,
  });

  const adminUsers = await getAdminUsers({ skip, limit }, filter);

  logger.debug('adminUsers', {
    adminUsers: JSON.parse(JSON.stringify(adminUsers)),
    loggerMetadata: clonedLoggerMetadata,
  });

  // TODO: list admin user
  const httpResponse: HttpResponse<GetAdminUsersResponse> = {
    response: adminUsers,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getAdminUsers = async (
  { skip, limit }: Paginator,
  filter: Partial<Record<keyof AdminUser, Condition<AdminUser>>>,
): Promise<GetAdminUsersResponse> => {
  const { adminUserDao } = await getServerDiContainer();
  const adminUsers = await adminUserDao.list({ skip, limit }, filter);

  return adminUsers;
};

export const updateAdminUsersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateAdminUsersHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfAdminUser(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfAdminUser(field) ||
    typeof newValueSanitized !== 'string'
  ) {
    logger.warn('updateAdminUsersHandler:bad_request', {
      params: {
        filters,
        type,
        field,
        newValue: newValueSanitized,
      },
      loggerMetadata: clonedLoggerMetadata,
    });

    throw new Error('bad_request');
  }
  logger.info('updateAdminUsers', {
    params: {
      filters,
      type,
      field,
      newValue: newValueSanitized,
    },
    loggerMetadata: clonedLoggerMetadata,
  });
  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof AdminUser, Condition<AdminUser>>
  >;
  const recordsToBeUpdated = await getAdminUsers(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(
    JSON.stringify(recordsToBeUpdated),
    'admin-user-recordstobeupdate',
  );
  const updateResult = await updateAdminUsers(
    filters,
    field,
    type,
    newValue,
    logger,
    loggerMetadata,
  );
  const { backofficeDbUpdateLogsDao } = await getServerDiContainer();
  const logData: Partial<IBackofficeDbUpdateLogs>[] =
    recordsToBeUpdated.data.map((record) => ({
      impactedRecordObjectId: JSON.stringify(record._id),
      tenantId: 'N/A',
      impactedRecordEmail: record?.email,
      collectionName: process.env.NEXT_PUBLIC_DB_AUTH_DATABASE,
      dbName: process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
      changedBy: loggerMetadata.userContext?.email,
      fieldChanged: field,
      oldValue: JSON.stringify(record?.[field as keyof AdminUserDto]), // Log the old value of the updated field
      newValue: JSON.stringify(newValue),
      filterUsed: JSON.stringify(filters),
      timestamp: new Date(),
    }));
  console.log('logData', logData);
  const response = await backofficeDbUpdateLogsDao.insertMany(logData);
  logger.info('updateAdminUsers result', {
    result: updateResult,
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<UpdateCollectionsResponse> = {
    response: updateResult,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateAdminUsers = async (
  filters: FilterCriteria[],
  field: keyof AdminUser,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateAdminUsers',
  };

  const { adminUserDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof AdminUser, Condition<AdminUser>>
  >;

  logger.debug('parsed filter object', {
    parsedFilterObject: parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await adminUserDao.updateByFilter(parsedFilterObject, field, null);
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await adminUserDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await adminUserDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await adminUserDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await adminUserDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
