/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {
  ColumnAccessSetting,
  ColumnAccessSettingDto,
} from '@/dataAccess/models/ColumnAccessSetting';
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
import { isKeyOfColumnAccessSetting } from '../[id]/__handlers/columnAccessSettingHandlers';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import winston from 'winston';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetColumnAccessSettingsResponse = Paginated<
  WithId<ColumnAccessSettingDto>
>;

type InsertManyColumnAccessSettingsResponse = WithId<ColumnAccessSettingDto>[];

export const columnAccessSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    | GetColumnAccessSettingsResponse
    | UpdateCollectionsResponse
    | InsertManyColumnAccessSettingsResponse
  >,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<
    | GetColumnAccessSettingsResponse
    | UpdateCollectionsResponse
    | InsertManyColumnAccessSettingsResponse
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
        | GetColumnAccessSettingsResponse
        | UpdateCollectionsResponse
        | InsertManyColumnAccessSettingsResponse
      >,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'columnAccessSettingsHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getColumnAccessSettingsHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', { loggerMetadata });

        console.log('request operation => ', req.query['operation']);
        const operation = req.query['operation'] ?? 'insert';
        if (operation === 'insert') {
          logger.debug('insert post', { loggerMetadata });

          return insertColumnAccessSettingHandler(
            req,
            res,
            logger,
            loggerMetadata,
          );
        } else {
          logger.debug('update post', {
            loggerMetadata,
          });

          return updateColumnAccessSettingHandler(
            req,
            res,
            logger,
            loggerMetadata,
          );
        }
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getColumnAccessSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetColumnAccessSettingsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getColumnAccessSettingsHandler',
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
    throw new Error('getColumnAccessSettingsHandler_bad_request');
  }
  console.log(otherQuery);
  const filter = filterQueryParamsParser(otherQuery);
  const columnAccessSettings = await (R.length(R.keys(filter)) > 0
    ? getColumnAccessSettings({ skip, limit }, filter)
    : getColumnAccessSettings({ skip, limit }));

  logger.debug('columnAccessSettings', {
    columnAccessSettings: JSON.parse(JSON.stringify(columnAccessSettings)),
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<GetColumnAccessSettingsResponse> = {
    response: columnAccessSettings,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getColumnAccessSettings = async (
  { skip, limit }: Paginator,
  filter?: Partial<
    Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
  >,
): Promise<GetColumnAccessSettingsResponse> => {
  const { columnSettingDao } = await getServerDiContainer();
  const columnAccessSettings = await columnSettingDao.list(
    { skip, limit },
    filter,
  );

  return columnAccessSettings;
};

export const insertColumnAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<InsertManyColumnAccessSettingsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'insertColumnAccessSettingHandler',
  };

  const columnAccessSettings = req.body as ColumnAccessSetting[];

  const { columnSettingDao } = await getServerDiContainer();
  const result = await columnSettingDao.insertMany(columnAccessSettings);
  console.log('insertColumnAccessSettingHandler result:', result);
  logger.debug('insertColumnAccessSettingHandler result:', {
    result: result,
    loggerMetadata: clonedLoggerMetadata,
  });
  const httpResponse: HttpResponse<InsertManyColumnAccessSettingsResponse> = {
    response: result,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const updateColumnAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateColumnAccessSettingHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfColumnAccessSetting(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfColumnAccessSetting(field) ||
    typeof newValueSanitized !== 'string'
  ) {
    logger.warn('updateColumnAccessSettingHandler_bad_request', {
      params: {
        filters,
        type,
        field,
        newValue: newValueSanitized,
      },
      loggerMetadata: clonedLoggerMetadata,
    });

    throw new Error('updateColumnAccessSettingHandler_bad_request');
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
    Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
  >;
  const recordsToBeUpdated = await getColumnAccessSettings(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(
    JSON.stringify(recordsToBeUpdated),
    'ColumnAccessSetting-recordstobeupdate',
  );
  const updateResult = await updateColumnAccessSettings(
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

export const updateColumnAccessSettings = async (
  filters: FilterCriteria[],
  field: keyof ColumnAccessSetting,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateColumnAccessSettings',
  };

  const { columnSettingDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await columnSettingDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
    );
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await columnSettingDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await columnSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await columnSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await columnSettingDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
