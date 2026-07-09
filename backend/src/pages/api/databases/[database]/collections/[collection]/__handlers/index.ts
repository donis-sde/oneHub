/* eslint-disable */
// @ts-nocheck
import { Paginated } from '@/types/Pagination';
import { SerializableDictionary } from '@/types/SerializableDictionary';
import { getEnv } from '@/utils/getEnv';
import { NextApiRequest, NextApiResponse } from 'next';
import { tenantHandler } from '../[id]/__handlers/tenantHandlers';
import { adminUsersHandler } from './adminUsersHandler';
import { partnersHandler } from './partnerHandlers';
import { settingsHandler } from './settingsHandlers';
import { tableAccessSettingsHandler } from './tableAccessSettingsHandlers';
import { columnAccessSettingsHandler } from './columnAccessSettingsHandlers';

export const listHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<any>,
): Promise<Paginated<SerializableDictionary>> => {
  const {
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
  } = getEnv();

  const partner_DB_DATABASE = process.env.PARTNER_DB_DATABASE;
  const partner_DB_COLLECTION = process.env.PARTNER_DB_COLLECTION;
  const TENANTS_DATABASE = process.env.TENANTS_DATABASE;
  const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;

  const { database, collection } = req.query;

  if (database === NEXT_PUBLIC_DB_AUTH_DATABASE) {
    if (collection === NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION) {
      await adminUsersHandler(req, res);
    }

    if (collection === NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION) {
      await tableAccessSettingsHandler(req, res);
    }

    if (collection === NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION) {
      await columnAccessSettingsHandler(req, res);
    }
  } else if (database === TENANTS_DATABASE) {
    if (collection === NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION) {
      await tenantHandler(req, res);
    }

    if (collection === MT_SETTING_COLLECTION_NAME) {
      await settingsHandler(req, res);
    }
  } else if (database === partner_DB_DATABASE) {
    if (collection === partner_DB_COLLECTION) {
      await partnersHandler(req, res);
    }
  }

  throw new Error('invalid_path');
};
