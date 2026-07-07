/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
/* eslint-disable */
import { Paginated } from '@/types/Pagination';
import { getEnv } from '@/utils/getEnv';
import type { NextApiRequest, NextApiResponse } from 'next';
import { adminUserHandler } from './__handlers/adminUserHandler';
import { tenantHandler } from './__handlers/tenantHandlers';
import { partnerHandler } from './__handlers/partnerHandlers';
import { settingsHandler } from './__handlers/settingsHandlers';
import { tableAccessSettingHandler } from './__handlers/tableAccessSettingHandlers';
import { columnAccessSettingHandler } from './__handlers/columnAccessSettingHandlers';
import setEnv from '../../../../../../../../setEnv';

export type GetCollectionResponse<
  R extends Record<string, unknown> = Record<string, unknown>,
> = Paginated<R>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetCollectionResponse<Record<string, any>>>,
): Promise<void> {
  try {
    const { database, collection, id } = req.query;

    if (
      typeof database !== 'string' ||
      typeof collection !== 'string' ||
      typeof id !== 'string'
    ) {
      throw new Error('bad_request');
    }

    const {
      NEXT_PUBLIC_DB_AUTH_DATABASE,
      NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
      NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
      NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
      NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
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
        return adminUserHandler(req, res as NextApiResponse<any>);
      case `${TENANTS_DATABASE}.${NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION}`:
        return tenantHandler(req, res as NextApiResponse<any>);
      case `${partner_DB_DATABASE}.${partner_DB_COLLECTION}`:
        return partnerHandler(req, res as NextApiResponse<any>);
      case `${TENANTS_DATABASE}.${MT_SETTING_COLLECTION_NAME}`:
        return settingsHandler(req, res as NextApiResponse<any>);
      case `${NEXT_PUBLIC_DB_AUTH_DATABASE}.${NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION}`:
        return tableAccessSettingHandler(req, res as NextApiResponse<any>);
      case `${NEXT_PUBLIC_DB_AUTH_DATABASE}.${NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION}`:
        return columnAccessSettingHandler(req, res as NextApiResponse<any>);
      default:
        throw new Error('bad_request');
    }
  } catch (err) {
    console.error(
      `/api/databases/${req.query.database}/collections/${req.query.collection}/id`,
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
