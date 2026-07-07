/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { Paginator } from '@/types/Pagination';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { filterQueryParamsParser } from '@/utils/mongooseUtils';

const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.GET }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.CROSS_COLLECTION_UPDATES_TENANT_AND_SETTINGS,
);
const mapFilterFields = (filter: Record<string, any>): Record<string, any> => {
  const tenantMapping: Record<string, string> = {
    StripeCustomerId: 'StripeCustomerId',
    StripeSubscriptionId: 'StripeSubscriptionId',
    WABAPhoneInfo: 'WABAPhoneInfo',
  };

  const settingsMapping: Record<string, string> = {
    StripeCustomerId: 'GeneralSetting.StripeCustomerId',
    StripeSubscriptionId: 'GeneralSetting.StripeSubscriptionId',
    WABAPhoneInfo: 'GeneralSetting.WABAPhoneInfo',
  };

  // Map fields for tenant collection
  const tenantFilter = Object.fromEntries(
    Object.entries(filter).map(([key, value]) => [
      tenantMapping[key] || key,
      value,
    ]),
  );

  // Map fields for settings collection
  const settingsFilter = Object.fromEntries(
    Object.entries(filter).map(([key, value]) => [
      settingsMapping[key] || key,
      value,
    ]),
  );

  return { tenantFilter, settingsFilter };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { tenantDao, settingsDao } = await getServerDiContainer();

      const { skip = 0, limit = 25, ...otherQuery } = req.query;
      console.log(otherQuery);
      const { tenantFilter, settingsFilter } = mapFilterFields(otherQuery);
      const tenantFilterAfterParsing = filterQueryParamsParser(tenantFilter);
      const settingsFilterAfterParsing =
        filterQueryParamsParser(settingsFilter);
      console.log('tenant filter in cross', tenantFilterAfterParsing);
      console.log('settings filter in cross', settingsFilterAfterParsing);
      console.log('req.query', req.query);
      const paginator: Paginator = {
        skip: Number(skip),
        limit: Number(limit),
      };
      if (otherQuery) {
        const tenantData = await tenantDao.list(
          paginator,
          tenantFilterAfterParsing,
        );
        const settingsData = await settingsDao.list(
          paginator,
          settingsFilterAfterParsing,
        );
        res.status(200).json({
          tenantData: tenantData.data,
          tenantCount: tenantData.count,
          settingsData: settingsData.data,
          settingsCount: settingsData.count,
        });
      } else {
        const tenantData = await tenantDao.list(paginator);
        const settingsData = await settingsDao.list(paginator);
        res.status(200).json({
          tenantData: tenantData.data,
          tenantCount: tenantData.count,
          settingsData: settingsData.data,
          settingsCount: settingsData.count,
        });
      }
    });
  } catch (error) {
    console.error('Failed to fetch tenant and setting collection data', error);
    res
      .status(500)
      .json({ error: 'Failed to fetch tenant and setting collection data' });
  }
}
