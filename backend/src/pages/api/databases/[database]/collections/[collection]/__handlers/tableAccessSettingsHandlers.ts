/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {
  TableAccessSetting,
  TableAccessSettingDto,
} from '@/dataAccess/models/TableAccessSetting';
import { HttpMethod } from '@/enums/HttpMethod';
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
import { isKeyOfTableAccessSetting } from '../[id]/__handlers/tableAccessSettingHandlers';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import winston from 'winston';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetTableAccessSettingsResponse = Paginated<WithId<TableAccessSettingDto>>;

type InsertManyTableAccessSettingsResponse = WithId<TableAccessSettingDto>[];

export const tableAccessSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    | GetTableAccessSettingsResponse
    | UpdateCollectionsResponse
    | InsertManyTableAccessSettingsResponse
  >,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<
    | GetTableAccessSettingsResponse
    | UpdateCollectionsResponse
    | InsertManyTableAccessSettingsResponse
  >([
    createLogContextMiddleware(),
    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.GET,
          roles: null,
        },
        {
          httpMethod: HttpMethod.POST,
          roles: null,
        },
      ],
      BackofficeFeature.NO_FEATURE,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<
        | GetTableAccessSettingsResponse
        | UpdateCollectionsResponse
        | InsertManyTableAccessSettingsResponse
      >,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'tableAccessSettingsHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getTableAccessSettingsHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.PUT) {
        logger.debug('put', {
          loggerMetadata,
        });
        return updateTableAccessSettingHandler(
          req,
          res,
          logger,
          loggerMetadata,
        );
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', {
          loggerMetadata,
        });
        return insertTableAccessSettingHandler(
          req,
          res,
          logger,
          loggerMetadata,
        );
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getTableAccessSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTableAccessSettingsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTableAccessSettingsHandler',
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
    throw new Error('getTableAccessSettingsHandler_bad_request');
  }
  console.log(otherQuery);
  const filter = filterQueryParamsParser(otherQuery);
  const tableAccessSettings = await (R.length(R.keys(filter)) > 0
    ? getTableAccessSettings({ skip, limit }, filter)
    : getTableAccessSettings({ skip, limit }));

  logger.debug('tableAccessSettings', {
    tableAccessSettings: JSON.parse(JSON.stringify(tableAccessSettings)),
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<GetTableAccessSettingsResponse> = {
    response: tableAccessSettings,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getTableAccessSettings = async (
  { skip, limit }: Paginator,
  filter?: Partial<
    Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
  >,
): Promise<GetTableAccessSettingsResponse> => {
  const { tableSettingDao } = await getServerDiContainer();
  const tableAccessSettings = await tableSettingDao.list(
    { skip, limit },
    filter,
  );

  return tableAccessSettings;
};

export const insertTableAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<InsertManyTableAccessSettingsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'insertColumnAccessSettingHandler',
  };
  const tableAccessSettings = req.body as TableAccessSetting[];

  const { tableSettingDao } = await getServerDiContainer();
  const result = await tableSettingDao.insertMany(tableAccessSettings);
  console.log('insertTableAccessSettingHandler result:', result);
  logger.debug('insertTableAccessSettingHandler result:', {
    result: result,
    loggerMetadata: clonedLoggerMetadata,
  });
  const httpResponse: HttpResponse<InsertManyTableAccessSettingsResponse> = {
    response: result,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateTableAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTableAccessSettingHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfTableAccessSetting(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfTableAccessSetting(field) ||
    typeof newValueSanitized !== 'string'
  ) {
    logger.warn('updateTableAccessSettingHandler_bad_request', {
      params: {
        filters,
        type,
        field,
        newValue: newValueSanitized,
      },
      loggerMetadata: clonedLoggerMetadata,
    });

    throw new Error('updateTableAccessSettingHandler_bad_request');
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
    Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
  >;
  const recordsToBeUpdated = await getTableAccessSettings(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(
    JSON.stringify(recordsToBeUpdated),
    'TableAccessSetting-recordstobeupdate',
  );
  const updateResult = await updateTableAccessSettings(
    filters,
    field,
    type,
    newValue,
    logger,
    clonedLoggerMetadata,
  );

  const httpResponse: HttpResponse<UpdateCollectionsResponse> = {
    response: updateResult,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateTableAccessSettings = async (
  filters: FilterCriteria[],
  field: keyof TableAccessSetting,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTableAccessSettings',
  };

  const { tableSettingDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await tableSettingDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
    );
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await tableSettingDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await tableSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await tableSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await tableSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
