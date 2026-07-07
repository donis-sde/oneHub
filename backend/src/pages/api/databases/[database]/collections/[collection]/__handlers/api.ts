/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import { IDao } from '@/dataAccess/_types/IDao';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { Paginated, Paginator } from '@/types/Pagination';
import { SerializableDictionary } from '@/types/SerializableDictionary';
import { getEnv } from '@/utils/getEnv';
import { serialize } from '@/utils/jsonUtils';
import { mapObjIndexed } from 'ramda';
import winston from 'winston';

const getDao = async (
  database: string,
  collection: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<IDao<any, any>> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getDao',
  };

  logger.debug('params', {
    params: {
      database,
      collection,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  const {
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
  } = getEnv();
  const { tenantDao, adminUserDao, partnerDao, settingsDao } =
    await getServerDiContainer();
  const partner_DB_DATABASE = process.env.PARTNER_DB_DATABASE;
  const partner_DB_COLLECTION = process.env.PARTNER_DB_COLLECTION;
  const TENANTS_DATABASE = process.env.TENANTS_DATABASE;
  const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;

  if (database === NEXT_PUBLIC_DB_AUTH_DATABASE) {
    if (collection === NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION) {
      return adminUserDao;
    }
  } else if (database === TENANTS_DATABASE) {
    if (collection === NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION) {
      return tenantDao;
    }
  } else if (database === partner_DB_DATABASE) {
    if (collection === partner_DB_COLLECTION) {
      return partnerDao;
    }
  } else if (database === TENANTS_DATABASE) {
    if (collection === MT_SETTING_COLLECTION_NAME) {
      return settingsDao;
    }
  }

  throw new Error('invalid_path');
};

export const getData = async (
  database: string,
  collection: string,
  paginator: Paginator,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<Paginated<SerializableDictionary>> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getData',
  };

  logger.debug('params', {
    params: {
      database,
      collection,
      paginator,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  const dao = await getDao(database, collection, logger, clonedLoggerMetadata);
  const results = await dao.list(paginator);
  return {
    ...results,
    data: results.data.map((doc: Record<string, unknown>) =>
      mapObjIndexed((v) => serialize(v), doc),
    ),
  };
};

export const getCount = async (
  database: string,
  collection: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<number> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getCount',
  };

  logger.debug('params', {
    params: {
      database,
      collection,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  const dao = await getDao(database, collection, logger, clonedLoggerMetadata);
  const count = await dao.count();

  return count;
};
