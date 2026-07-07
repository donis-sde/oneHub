/* eslint-disable */
// @ts-nocheck
import { Partner, PartnerDto } from '@/dataAccess/models/Partner';
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
import { isKeyOfPartner } from '../[id]/__handlers/partnerHandlers';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetPartnersResponse = Paginated<WithId<PartnerDto>>;

export const partnersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetPartnersResponse | UpdateCollectionsResponse>,
): Promise<void> => {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener<GetPartnersResponse | UpdateCollectionsResponse>([
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
      BackofficeFeature.MT_PARTNER,
    ),
    async (
      req: NextApiRequest,
      res: NextApiResponse<GetPartnersResponse | UpdateCollectionsResponse>,
    ): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'partnersHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        return getPartnersHandler(req, res, logger, loggerMetadata);
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', {
          loggerMetadata,
        });
        return updatePartnersHandler(req, res, logger, loggerMetadata);
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
};

export const getPartnersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetPartnersResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getPartnersHandler',
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
  const partners = await (R.length(R.keys(filter)) > 0
    ? getPartners({ skip, limit }, filter)
    : getPartners({ skip, limit }));
  logger.debug('partners', {
    partners: JSON.parse(JSON.stringify(partners)),
    loggerMetadata: clonedLoggerMetadata,
  });
  //   const filteredPartners = partners.data.map((partner) => ({
  //     _id: partner._id,
  //     CustomerId: partner.CustomerId,
  //     Created: partner.Created,
  //     LastUpdated: partner.LastUpdated,
  //     FirstName: partner.FirstName,
  //     LastName: partner.LastName,
  //     Email: partner.Email,
  //     Phone: partner.Phone,
  //     Company: partner.Company,
  //     PartnerKey: partner.PartnerKey,
  //     JoinedDate: partner.JoinedDate,
  //   }));

  //   const updatedPartners = {
  //     ...partners,
  //     data: filteredPartners,
  //   };

  const httpResponse: HttpResponse<GetPartnersResponse> = {
    response: partners,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const getPartners = async (
  { skip, limit }: Paginator,
  filter?: Partial<Record<keyof Partner, Condition<Partner>>>,
): Promise<GetPartnersResponse> => {
  const { partnerDao } = await getServerDiContainer();
  const partners = await partnerDao.list({ skip, limit }, filter);

  return partners;
};

export const updatePartnersHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updatePartnersHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfPartner(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfPartner(field) ||
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
    Record<keyof Partner, Condition<Partner>>
  >;
  const recordsToBeUpdated = await getPartners(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );
  console.log(JSON.stringify(recordsToBeUpdated), 'Partner-recordstobeupdate');

  const updateResult = await updatePartners(
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
      tenantId: 'N/A',
      impactedRecordEmail: record?.Email,
      collectionName: process.env.PARTNER_DB_DATABASE,
      dbName: process.env.PARTNER_DB_COLLECTION,
      changedBy: loggerMetadata.userContext?.email,
      fieldChanged: field,
      oldValue: JSON.stringify(record?.[field as keyof PartnerDto]), // Log the old value of the updated field
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

export const updatePartners = async (
  filters: FilterCriteria[],
  field: keyof Partner,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updatePartners',
  };

  const { partnerDao } = await getServerDiContainer();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Partner, Condition<Partner>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await partnerDao.updateByFilter(parsedFilterObject, field, null);
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await partnerDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await partnerDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await partnerDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await partnerDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};
