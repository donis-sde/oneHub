/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {
  TableAccessSetting,
  TableAccessSettingDto,
  tableAccessSettingSchema,
} from '@/dataAccess/models/TableAccessSetting';
import { HttpMethod } from '@/enums/HttpMethod';
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

export type GetTableAccessSettingResponse = TableAccessSettingDto | null;
export type UpdateTableAccessSettingResponse = TableAccessSettingDto | null;

type TableAccessSettingResponse =
  | UpdateTableAccessSettingResponse
  | GetTableAccessSettingResponse
  | HttpErrorResponse;

export const tableAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<TableAccessSettingResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<TableAccessSettingResponse>([
    createLogContextMiddleware(),
    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.PATCH,
          roles: null,
        },
        {
          httpMethod: HttpMethod.GET,
          roles: null,
        },
      ],
      BackofficeFeature.NO_FEATURE,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<TableAccessSettingResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'tableAccessSettingHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });

        return patchTableAccessSettingHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });

        return getTableAccessSettingHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfTableAccessSetting = (
  v: string,
): v is keyof TableAccessSetting => {
  return !!tableAccessSettingSchema.paths[v];
};

const getTableAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTableAccessSettingResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTableAccessSettingHandler',
  };

  const { tableSettingDao } = await getServerDiContainer();
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

  const tableSetting = await tableSettingDao.get(id);

  logger.debug('tableAccessSetting', {
    tableSetting: JSON.parse(JSON.stringify(tableSetting)),
    loggerMetadata: clonedLoggerMetadata,
  });

  if (!tableSetting) {
    return res.status(404).json({ err: 'no_tableAccessSetting' });
  }

  res.status(200).json(tableSetting);
};

export const patchTableAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateTableAccessSettingResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchTableAccessSettingHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfTableAccessSetting(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchTableAccessSettingHandler:bad_request', {
        params: {
          id,
          type,
          field,
          newValue: newValueSanitized,
        },
        loggerMetadata: clonedLoggerMetadata,
      });

      throw new Error('patchTableAccessSettingHandler_bad_request');
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
    const { tableSettingDao } = await getServerDiContainer();
    const recordsToBeUpdated = await tableSettingDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'tableAccessSetting-single-recordstobeupdate',
    );
    const tableAccessSetting = await updateTableAccessSetting(
      id,
      field,
      type,
      newValueSanitized,
      logger,
      loggerMetadata,
    );

    if (!tableAccessSetting) {
      return applyResponse({ status: 404, response: null })(res);
    }

    const httpResponse: HttpResponse<UpdateTableAccessSettingResponse> = {
      response: tableAccessSetting,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updateTableAccessSetting = async (
  id: string,
  field: keyof TableAccessSetting,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateTableAccessSettingResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTableAccessSetting',
  };

  const { tableSettingDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const tableAccessSetting = (async (): Promise<TableAccessSetting> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await tableSettingDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await tableSettingDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await tableSettingDao.updateField(
          id,
          field,
          JSON.parse(newValue),
        );
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await tableSettingDao.updateField(
          id,
          field,
          JSON.parse(newValue),
        );
      } else {
        return await tableSettingDao.updateField(id, field, newValue);
      }
    }
  })();

  return tableAccessSetting;
};
