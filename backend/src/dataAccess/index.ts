/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable */
import { getPublicEnv } from '@/utils/getEnv';
import { Schema } from 'mongoose';
import { AdminUser, adminUserSchema } from './models/AdminUser';
import { Tenant, tenantSchema } from './models/Tenant';
import { Partner, partnerSchema } from './models/Partner';
import { Transaction, transactionSchema } from './models/Transaction';
import { Settings, settingsSchema } from './models/Settings';
import {
  TableAccessSetting,
  tableAccessSettingSchema,
} from './models/TableAccessSetting';
import {
  ColumnAccessSetting,
  columnAccessSettingSchema,
} from './models/ColumnAccessSetting';
import { useState } from 'react';
import setEnv from '../../setEnv';

export const getModel = (
  database: string,
  collection: string,
  url: string,
): { schema: Schema; class: object } => {
  const [fullUrl, setFullUrl] = useState('');
  const {
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
  } = getPublicEnv();
  if (database.includes('mt-dev-Tenants')) {
    url = 'mt-dev-wati-backoffice';
  } else if (database.includes('eu-')) {
    url = 'eu';
  } else if (database.includes('prod')) {
    url = 'mt-backoffice';
  } else if (database.includes('stage')) {
    url = 'stage';
  } else {
    url = 'http://localhost';
  }
  const { MT_DB_NAME, PARTNER_DATABASE } = setEnv(url);
  const partner_DB_DATABASE = PARTNER_DATABASE;
  const partner_DB_COLLECTION = process.env.PARTNER_DB_COLLECTION;
  const transaction_DB_COLLECTION = process.env.TRANSACTION_DB_COLLECTION;
  const TENANTS_DATABASE = MT_DB_NAME;
  const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;
  const NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION =
    process.env.NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION;
  const NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION =
    process.env.NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION;

  if (
    database === NEXT_PUBLIC_DB_AUTH_DATABASE &&
    collection === NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION
  ) {
    return { schema: adminUserSchema, class: AdminUser };
  } else if (
    database === NEXT_PUBLIC_DB_AUTH_DATABASE &&
    collection === NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION
  ) {
    return { schema: tableAccessSettingSchema, class: TableAccessSetting };
  } else if (
    database === NEXT_PUBLIC_DB_AUTH_DATABASE &&
    collection === NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION
  ) {
    return { schema: columnAccessSettingSchema, class: ColumnAccessSetting };
  } else if (
    database === TENANTS_DATABASE &&
    collection === NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION
  ) {
    return { schema: tenantSchema, class: Tenant };
  } else if (
    database == partner_DB_DATABASE &&
    collection == partner_DB_COLLECTION
  ) {
    return { schema: partnerSchema, class: Partner };
  } else if (
    database == TENANTS_DATABASE &&
    collection == MT_SETTING_COLLECTION_NAME
  ) {
    return { schema: settingsSchema, class: Settings };
  } else if (collection == transaction_DB_COLLECTION) {
    return { schema: transactionSchema, class: Transaction };
  }

  throw new Error('invalid_model');
};
