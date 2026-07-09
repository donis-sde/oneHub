/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
/* eslint-disable */
import { AdminUserDto } from '@/dataAccess/models/AdminUser';
import { Tenant } from '@/dataAccess/models/Tenant';
import { Paginated } from '@/types/Pagination';
import { getEnv } from '@/utils/getEnv';
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminUsersHandler } from './__handlers/adminUsersHandler';
import { tenantsHandler } from './__handlers/tenantsHandlers';
import { partnersHandler } from './__handlers/partnerHandlers';
import { settingsHandler } from './__handlers/settingsHandlers';
import { Partner, PartnerDto } from '@/dataAccess/models/Partner';
import { Settings, SettingsDto } from '@/dataAccess/models/Settings';
import setEnv from '../../../../../../../setEnv';
import { columnAccessSettingsHandler } from './__handlers/columnAccessSettingsHandlers';
import { ColumnAccessSettingDto } from '@/dataAccess/models/ColumnAccessSetting';
import { tableAccessSettingsHandler } from './__handlers/tableAccessSettingsHandlers';
import { TableAccessSettingDto } from '@/dataAccess/models/TableAccessSetting';

export type GetCollectionsResponse<
  R extends Record<string, unknown> = Record<string, unknown>,
> = Paginated<R>;

export type UpdateCollectionsResponse = {
  matchedCount: number;
  updatedCount: number;
};

export type InsertCollectionsResponse<
  R extends Record<string, unknown> = Record<string, unknown>,
> = R[];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    GetCollectionsResponse<Record<string, any> | UpdateCollectionsResponse>
  >,
): Promise<void> {
  try {
    const { database, collection } = req.query;

    if (typeof database !== 'string' || typeof collection !== 'string') {
      throw new Error('bad_request');
    }

    const {
      NEXT_PUBLIC_DB_AUTH_DATABASE,
      NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
      NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
      NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
      NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
    } = getEnv();
    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const url = `${protocol}://${host}${req.url}`;
    const { MT_DB_NAME, PARTNER_DATABASE } = await setEnv(url);
    const partner_DB_DATABASE = PARTNER_DATABASE;
    const partner_DB_COLLECTION = process.env.PARTNER_DB_COLLECTION;
    const TENANTS_DATABASE = MT_DB_NAME;
    const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;

    switch (`${database}.${collection}`) {
      case `${NEXT_PUBLIC_DB_AUTH_DATABASE}.${NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION}`:
        return adminUsersHandler(
          req,
          res as NextApiResponse<
            Paginated<AdminUserDto> | UpdateCollectionsResponse
          >,
        );
      case `${TENANTS_DATABASE}.${NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION}`:
        return tenantsHandler(
          req,
          res as NextApiResponse<Paginated<Tenant> | UpdateCollectionsResponse>,
        );
      case `${partner_DB_DATABASE}.${partner_DB_COLLECTION}`:
        return partnersHandler(
          req,
          res as NextApiResponse<
            Paginated<PartnerDto> | UpdateCollectionsResponse
          >,
        );
      case `${TENANTS_DATABASE}.${MT_SETTING_COLLECTION_NAME}`:
        return settingsHandler(
          req,
          res as NextApiResponse<
            Paginated<Settings> | UpdateCollectionsResponse
          >,
        );
      case `${NEXT_PUBLIC_DB_AUTH_DATABASE}.${NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION}`:
        return tableAccessSettingsHandler(
          req,
          res as NextApiResponse<
            | Paginated<TableAccessSettingDto>
            | UpdateCollectionsResponse
            | InsertCollectionsResponse
          >,
        );
      case `${NEXT_PUBLIC_DB_AUTH_DATABASE}.${NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION}`:
        return columnAccessSettingsHandler(
          req,
          res as NextApiResponse<
            | Paginated<ColumnAccessSettingDto>
            | UpdateCollectionsResponse
            | InsertCollectionsResponse
          >,
        );
      default:
        throw new Error('bad_request');
    }
  } catch (err) {
    console.error(
      `/api/databases/${req.query.database}/collections/${req.query.collection}`,
      { err: `${err}` },
    );

    res.status(500).json({
      data: [],
      paginator: { skip: 0, limit: 0 },
      hasNext: false,
      count: 0,
    });
  }
}
