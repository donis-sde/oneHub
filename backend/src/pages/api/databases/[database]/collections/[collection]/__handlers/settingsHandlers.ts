/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
/* eslint-disable */
import { Settings, SettingsDto } from '@/dataAccess/models/Settings';
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
import { isKeyOfSettings } from '../[id]/__handlers/settingsHandlers';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetSettingsResponse = Paginated<WithId<SettingsDto>>;

export const settingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetSettingsResponse | UpdateCollectionsResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<GetSettingsResponse | UpdateCollectionsResponse>([
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
      BackofficeFeature.MT_SETTINGS,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<GetSettingsResponse | UpdateCollectionsResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'settingsHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getSettingsHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', {
          loggerMetadata,
        });
        return updateSettingsHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetSettingsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getSettingsHandler',
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

  const settings = await (R.length(R.keys(filter)) > 0
    ? getSettings({ skip, limit }, filter)
    : getSettings({ skip, limit }));

  logger.debug('settings', {
    settings: JSON.parse(JSON.stringify(settings)),
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<GetSettingsResponse> = {
    response: settings,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getSettings = async (
  { skip, limit }: Paginator,
  filter?: Partial<Record<keyof Settings, Condition<Settings>>>,
): Promise<GetSettingsResponse> => {
  const { settingsDao } = await getServerDiContainer();
  const settings = await settingsDao.list({ skip, limit }, filter);

  return settings;
};

export const updateSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateSettingsHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfSettings(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfSettings(field) ||
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
    Record<keyof Settings, Condition<Settings>>
  >;
  const recordsToBeUpdated = await getSettings(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(JSON.stringify(recordsToBeUpdated), 'Settings-recordstobeupdate');
  const updateResult = await updateSettings(
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
      impactedRecordEmail: 'N/A',
      collectionName: process.env.MT_SETTING_COLLECTION_NAME,
      dbName: process.env.MT_DB_NAME,
      changedBy: loggerMetadata.userContext?.email,
      fieldChanged: field,
      oldValue: JSON.stringify(record?.[field as keyof SettingsDto]), // Log the old value of the updated field
      newValue: JSON.stringify(newValue),
      filterUsed: JSON.stringify(filters),
      timestamp: new Date(),
    }));
  const response = await backofficeDbUpdateLogsDao.insertMany(logData);
  logger.info('updateResult', {
    result: updateResult,
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<UpdateCollectionsResponse> = {
    response: updateResult,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateSettings = async (
  filters: FilterCriteria[],
  field: keyof Settings,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateSettings',
  };

  const { settingsDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Settings, Condition<Settings>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await settingsDao.updateByFilter(parsedFilterObject, field, null);
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await settingsDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await settingsDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await settingsDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await settingsDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
