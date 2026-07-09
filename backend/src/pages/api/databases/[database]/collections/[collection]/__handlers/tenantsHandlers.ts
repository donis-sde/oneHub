/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { Tenant, TenantDto } from '@/dataAccess/models/Tenant';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Paginated, Paginator } from '@/types/Pagination';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import {
  filterQueryParamsParser,
  parseFilterObject,
} from '@/utils/mongooseUtils';
import { Condition, WithId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import * as R from 'ramda';
import { UpdateCollectionsResponse } from '..';
import {
  MongooseExtendedType,
  MongooseExtendedTypeEnum,
  isMongooseExtendedType,
} from '@/types/MongooseExtendedTypes';
import { isKeyOfTenant } from '../[id]/__handlers/tenantHandlers';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetTenantsResponse = Paginated<WithId<TenantDto>>;

export const tenantsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTenantsResponse | UpdateCollectionsResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<GetTenantsResponse | UpdateCollectionsResponse>([
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
      BackofficeFeature.MT_TENANT,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<GetTenantsResponse | UpdateCollectionsResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'tenantsHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getTenantsHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', {
          loggerMetadata,
        });
        return updateTenantsHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getTenantsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTenantsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTenantsHandler',
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
  console.log(otherQuery);
  const filter = filterQueryParamsParser(otherQuery);
  const tenants = await (R.length(R.keys(filter)) > 0
    ? getTenants({ skip, limit }, filter)
    : getTenants({ skip, limit }));

  logger.debug('tenants', {
    tenants: JSON.parse(JSON.stringify(tenants)),
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<GetTenantsResponse> = {
    response: tenants,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getTenants = async (
  { skip, limit }: Paginator,
  filter?: Partial<Record<keyof Tenant, Condition<Tenant>>>,
): Promise<GetTenantsResponse> => {
  const { tenantDao } = await getServerDiContainer();
  const tenants = await tenantDao.list({ skip, limit }, filter);

  return tenants;
};

export const updateTenantsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTenantsHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfTenant(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfTenant(field) ||
    typeof newValueSanitized !== 'string'
  ) {
    logger.warn('bad_request', {
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

  logger.info('params', {
    params: {
      filters,
      type,
      field,
      newValue: newValueSanitized,
    },
    loggerMetadata: clonedLoggerMetadata,
  });
  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Tenant, Condition<Tenant>>
  >;
  const recordsToBeUpdated = await getTenants(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(JSON.stringify(recordsToBeUpdated), 'Tenant-recordstobeupdate');
  const updateResult = await updateTenants(
    filters,
    field,
    type,
    newValue,
    logger,
    clonedLoggerMetadata,
  );
  const { backofficeDbUpdateLogsDao } = await getServerDiContainer();
  const logData: Partial<IBackofficeDbUpdateLogs>[] =
    recordsToBeUpdated.data.map((record) => ({
      impactedRecordObjectId: JSON.stringify(record._id),
      tenantId: record?.TenantId,
      impactedRecordEmail: record?.ClientEmail,
      collectionName: process.env.NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
      dbName: process.env.MT_DB_NAME,
      changedBy: loggerMetadata.userContext?.email,
      fieldChanged: field,
      oldValue: JSON.stringify(record?.[field as keyof TenantDto]), // Log the old value of the updated field
      newValue: JSON.stringify(newValue),
      filterUsed: JSON.stringify(filters),
      timestamp: new Date(),
    }));
  const response = await backofficeDbUpdateLogsDao.insertMany(logData);
  logger.info('updateResult---->>>>', {
    result: updateResult,
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<UpdateCollectionsResponse> = {
    response: updateResult,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateTenants = async (
  filters: FilterCriteria[],
  field: keyof Tenant,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTenants',
  };

  const { tenantDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Tenant, Condition<Tenant>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await tenantDao.updateByFilter(parsedFilterObject, field, null);
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await tenantDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await tenantDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await tenantDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await tenantDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
