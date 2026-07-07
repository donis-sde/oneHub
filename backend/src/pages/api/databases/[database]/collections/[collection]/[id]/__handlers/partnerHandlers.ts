/* eslint-disable */
// @ts-nocheck
import {
  Partner,
  PartnerDto,
  partnerSchema,
} from '@/dataAccess/models/Partner';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
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

export type GetPartnerResponse = PartnerDto | null;
export type UpdatePartnerResponse = PartnerDto | null;

type PartnerResponse =
  | UpdatePartnerResponse
  | GetPartnerResponse
  | HttpErrorResponse;

export const partnerHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<PartnerResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();

  await middlewareFlattener<PartnerResponse>([
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
      BackofficeFeature.MT_PARTNER,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<PartnerResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'partnerHandler',
        API: 'databases/[id]',
      };

      if (req.method === HttpMethod.PATCH) {
        logger.debug('patch', {
          loggerMetadata,
        });

        return patchPartnerHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });

        return getPartnerHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const isKeyOfPartner = (v: string): v is keyof Partner => {
  return !!partnerSchema.paths[v];
};

const getPartnerHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetPartnerResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getPartnerHandler',
  };

  const { partnerDao } = await getServerDiContainer();
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

  const partner = await partnerDao.get(id);

  logger.debug('partner', {
    partner: JSON.parse(JSON.stringify(partner)),
    loggerMetadata: clonedLoggerMetadata,
  });

  if (!partner) {
    return res.status(404).json({ err: 'no_partner' });
  }

  res.status(200).json(partner);
};

export const patchPartnerHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdatePartnerResponse | HttpErrorResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'patchPartnerHandler',
  };

  try {
    const { id } = req.query;
    const { field, newValue = '', type } = req.body;
    const newValueSanitized = newValue ?? '';
    if (
      typeof id !== 'string' ||
      !isMongooseExtendedType(type) ||
      !isKeyOfPartner(field) ||
      typeof newValueSanitized !== 'string'
    ) {
      logger.error('patchPartnerHandler:bad_request', {
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
    const { partnerDao } = await getServerDiContainer();
    const recordsToBeUpdated = await partnerDao.get(id);
    console.log(
      JSON.stringify(recordsToBeUpdated),
      'partner-single-recordstobeupdate',
    );
    const partner = await updatePartner(
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
        tenantId: 'N/A',
        impactedRecordEmail: recordsToBeUpdated?.Email,
        oldValue: JSON.stringify(
          recordsToBeUpdated?.[field as keyof PartnerDto],
        ),
        collectionName: process.env.PARTNER_DB_DATABASE,
        dbName: process.env.PARTNER_DB_COLLECTION,
        changedBy: loggerMetadata.userContext?.email,
        fieldChanged: field,
        filterUsed: 'updated without using filter',
        newValue: JSON.stringify(newValueSanitized),
        timestamp: new Date(),
      },
    ];
    const response = await backofficeDbUpdateLogsDao.insertMany(logData);
    console.log(
      `in idone: -->>${filters},,,,${field},,,,,${type},,,,,${newValue},,,,,${logger},,,,,,${clonedLoggerMetadata}`,
    );
    logger.info('partner', {
      partner: JSON.parse(JSON.stringify(partner)),
      loggerMetadata: clonedLoggerMetadata,
    });

    if (!partner) {
      return applyResponse({ status: 404, response: null })(res);
    }

    const httpResponse: HttpResponse<UpdatePartnerResponse> = {
      response: partner,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (err) {
    applyResponse({ status: 500, response: { err: `${err}` } })(res);
  }
};

export const updatePartner = async (
  id: string,
  field: keyof Partner,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdatePartnerResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updatePartner',
  };

  const { partnerDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { id, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const partner = (async (): Promise<Partner> => {
    if (type === MongooseExtendedTypeEnum.NULL) {
      return await partnerDao.updateField(id, field, null);
    } else if (type === MongooseExtendedTypeEnum.UNSET) {
      return await partnerDao.deleteField(id, field);
    } else {
      if (type === MongooseExtendedTypeEnum.MAP) {
        return await partnerDao.updateField(id, field, JSON.parse(newValue));
      } else if (type === mongoose.Schema.Types.Array.schemaName) {
        return await partnerDao.updateField(id, field, JSON.parse(newValue));
      } else {
        return await partnerDao.updateField(id, field, newValue);
      }
    }
  })();

  return partner;
};
