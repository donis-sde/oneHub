/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { updateTenantsHandler } from '../databases/[database]/collections/[collection]/__handlers/tenantsHandlers';
import { updateSettingsHandler } from '../databases/[database]/collections/[collection]/__handlers/settingsHandlers';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.POST }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.CROSS_COLLECTION_UPDATES_TENANT_AND_SETTINGS,
);
const tenantMapping: Record<string, string> = {
  StripeCustomerId: 'StripeCustomerId',
  StripeSubscriptionId: 'StripeSubscriptionId',
  WABAID: 'WABAID',
};

const settingsMapping: Record<string, string> = {
  StripeCustomerId: 'GeneralSetting.StripeCustomerId',
  StripeSubscriptionId: 'GeneralSetting.StripeSubscriptionId',
  WABAID: 'GeneralSetting.WABusinessAccountId',
};
const mapFilterFields = (
  filters: Array<Record<string, any>>,
): Record<string, any> => {
  // Map filters for tenant collection
  const tenantFilters = filters.map((filter: Record<string, any>) => ({
    ...filter,
    field: tenantMapping[filter.field] || filter.field,
  }));

  // Map filters for settings collection
  const settingsFilters = filters.map((filter: Record<string, any>) => ({
    ...filter,
    field: settingsMapping[filter.field] || filter.field,
  }));

  return { tenantFilters, settingsFilters };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      //   const { skip = 0, limit = 25, ...otherQuery } = req.query;
      console.log(req.body);
      const { tenantFilters, settingsFilters } = mapFilterFields(
        req.body.filters,
      );
      console.log('tenant filter in cross', tenantFilters);
      console.log('settings filter in cross', settingsFilters);
      const modifiedReqForSettings = {
        ...req,
        body: {
          ...req.body,
          filters: settingsFilters,
          editParams: {
            ...req.body.editParams,
            field: settingsMapping[req.body.editParams.field], // Map field or use original
          }, // Add or modify fields
        },
      };

      // Modify req.body for updateTenantsHandler
      const modifiedReqForTenants = {
        ...req,
        body: {
          ...req.body,
          filters: tenantFilters,
          editParams: {
            ...req.body.editParams,
            field: tenantMapping[req.body.editParams.field], // Map field or use original
          }, // Add or modify fields
        },
      };
      const { logger } = await getServerDiContainer();
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'crossCollectionUpdateTenantAndSettings',
        API: 'CrossCollection',
      };
      console.log('modifiedReqForSettings', modifiedReqForSettings.body);
      console.log('modifiedReqForSettings', modifiedReqForTenants.body);
      const tenantData = await updateTenantsHandler(
        modifiedReqForTenants as NextApiRequest,
        res,
        logger,
        loggerMetadata,
      );
      const settingsData = await updateSettingsHandler(
        modifiedReqForSettings as NextApiRequest,
        res,
        logger,
        loggerMetadata,
      );
      res.status(200).json({
        tenantData,
        settingsData,
      });
    });
  } catch (error) {
    console.error('Failed to update tenant and setting collection data', error);
    res
      .status(500)
      .json({ error: 'Failed to update tenant and setting collection data' });
  }
}
