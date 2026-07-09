/* eslint-disable */
// @ts-nocheck
import {
  Settings,
  SettingsDto,
  settingsSchema,
} from '@/dataAccess/models/Settings';
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

export type GetSettingsResponse = SettingsDto | null;
export type UpdateSettingsResponse = SettingsDto | null;

type SettingsResponse =
  | UpdateSettingsResponse
  | GetSettingsResponse
  | HttpErrorResponse;

export const settingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<SettingsResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<SettingsResponse>([
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
      BackofficeFeature.MT_SETTINGS,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<SettingsResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'settingsHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });

        return patchSettingsHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });

        return getSettingsHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfSettings = (v: string): v is keyof Settings => {
  if (
    v === 'GeneralSetting.WABusinessAccountId' ||
    v === 'GeneralSetting.StripeSubscriptionId' ||
    v === 'GeneralSetting.StripeCustomerId'
  ) {
    return true;
  }
  return !!settingsSchema.paths[v];
};

const getSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetSettingsResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getSettingsHandler',
  };

  const { settingsDao } = await getServerDiContainer();
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

  const settings = await settingsDao.get(id);

  logger.debug('settings', {
    settings: JSON.parse(JSON.stringify(settings)),
    loggerMetadata: clonedLoggerMetadata,
  });

  if (!settings) {
    return res.status(404).json({ err: 'no_settings' });
  }

  res.status(200).json(settings);
};

export const patchSettingsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateSettingsResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchSettingsHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfSettings(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchSettingsHandler:bad_request', {
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
    const { settingsDao } = await getServerDiContainer();
    const recordsToBeUpdated = await settingsDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'settings-single-recordstobeupdate',
    );
    const settings = await updateSettings(
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
        impactedRecordEmail: 'N/A',
        oldValue: JSON.stringify(
          recordsToBeUpdated?.[field as keyof SettingsDto],
        ),
        collectionName: process.env.MT_SETTING_COLLECTION_NAME,
        dbName: process.env.MT_DB_NAME,
        changedBy: loggerMetadata.userContext?.email,
        fieldChanged: field,
        filterUsed: 'updated without using filter',
        newValue: JSON.stringify(newValueSanitized),
        timestamp: new Date(),
      },
    ];
    const response = await backofficeDbUpdateLogsDao.insertMany(logData);
    logger.info('settings', {
      settings: JSON.parse(JSON.stringify(settings)),
      loggerMetadata: clonedLoggerMetadata,
    });

    if (!settings) {
      return applyResponse({ status: 404, response: null })(res);
    }

    const httpResponse: HttpResponse<UpdateSettingsResponse> = {
      response: settings,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updateSettings = async (
  id: string,
  field: keyof Settings,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateSettingsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateSettings',
  };
  console.log('id', id);
  console.log('field', field);
  console.log('type', type);
  console.log('newValue', newValue);

  const { settingsDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const settings = (async (): Promise<Settings> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await settingsDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await settingsDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await settingsDao.updateField(id, field, JSON.parse(newValue));
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await settingsDao.updateField(id, field, JSON.parse(newValue));
      } else {
        return await settingsDao.updateField(id, field, newValue);
      }
    }
  })();

  return settings;
};
