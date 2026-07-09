/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import {
  ColumnAccessSetting,
  ColumnAccessSettingDto,
  columnAccessSettingSchema,
} from '@/dataAccess/models/ColumnAccessSetting';
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

export type GetColumnAccessSettingResponse = ColumnAccessSettingDto | null;
export type UpdateColumnAccessSettingResponse = ColumnAccessSettingDto | null;

type ColumnAccessSettingResponse =
  | UpdateColumnAccessSettingResponse
  | GetColumnAccessSettingResponse
  | HttpErrorResponse;

export const columnAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<ColumnAccessSettingResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<ColumnAccessSettingResponse>([
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
      res: NextApiResponse<ColumnAccessSettingResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'columnAccessSettingHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });

        return patchColumnAccessSettingHandler(
          req,
          res,
          logger,
          loggerMetadata,
        );
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });

        return getColumnAccessSettingHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfColumnAccessSetting = (
  v: string,
): v is keyof ColumnAccessSetting => {
  return !!columnAccessSettingSchema.paths[v];
};

const getColumnAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetColumnAccessSettingResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getColumnAccessSettingHandler',
  };

  const { columnSettingDao } = await getServerDiContainer();
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

  const columnSetting = await columnSettingDao.get(id);

  logger.debug('columnAccessSetting', {
    columnSetting: JSON.parse(JSON.stringify(columnSetting)),
    loggerMetadata: clonedLoggerMetadata,
  });

  if (!columnSetting) {
    return res.status(404).json({ err: 'no_columnAccessSetting' });
  }

  res.status(200).json(columnSetting);
};

export const patchColumnAccessSettingHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateColumnAccessSettingResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchColumnAccessSettingHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfColumnAccessSetting(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchColumnAccessSettingHandler:bad_request', {
        params: {
          id,
          type,
          field,
          newValue: newValueSanitized,
        },
        loggerMetadata: clonedLoggerMetadata,
      });

      throw new Error('patchColumnAccessSettingHandler_bad_request');
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
    const { columnSettingDao } = await getServerDiContainer();
    const recordsToBeUpdated = await columnSettingDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'columnAccessSetting-single-recordstobeupdate',
    );
    const columnAccessSetting = await updateColumnAccessSetting(
      id,
      field,
      type,
      newValueSanitized,
      logger,
      loggerMetadata,
    );

    if (!columnAccessSetting) {
      return applyResponse({ status: 404, response: null })(res);
    }

    const httpResponse: HttpResponse<UpdateColumnAccessSettingResponse> = {
      response: columnAccessSetting,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updateColumnAccessSetting = async (
  id: string,
  field: keyof ColumnAccessSetting,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateColumnAccessSettingResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateColumnAccessSetting',
  };

  const { columnSettingDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const columnAccessSetting = (async (): Promise<ColumnAccessSetting> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await columnSettingDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await columnSettingDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await columnSettingDao.updateField(
          id,
          field,
          JSON.parse(newValue),
        );
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await columnSettingDao.updateField(
          id,
          field,
          JSON.parse(newValue),
        );
      } else {
        return await columnSettingDao.updateField(id, field, newValue);
      }
    }
  })();

  return columnAccessSetting;
};
