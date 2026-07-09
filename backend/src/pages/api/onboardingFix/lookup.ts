/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/enums/HttpMethod';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const { logger } = await getServerDiContainer();

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    await middlewareFlattener([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.GET,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.ONBOARDING_FIX,
      ),
      async (
        req: NextApiRequest,
        res: NextApiResponse,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const { tenantDao, cloudApiSetupProcessDao } =
          await getServerDiContainer();

        const subscriptionId = req.query.subscriptionId as string;

        if (!subscriptionId) {
          return res
            .status(400)
            .json({ error: 'subscriptionId query parameter is required' });
        }

        const tenants = await tenantDao.getByFilter({
          StripeSubscriptionId: subscriptionId,
        });
        const tenant = tenants?.[0];

        if (!tenant) {
          return res.status(404).json({
            error: `No tenant found for StripeSubscriptionId: ${subscriptionId}`,
          });
        }

        const tenantObjectId = tenant._id.toString();
        const records = await cloudApiSetupProcessDao.getAllByTenantId(
          tenantObjectId,
        );

        return res.status(200).json({
          tenant: {
            _id: tenant._id,
            TenantId: tenant.TenantId,
            State: tenant.State,
            StripeSubscriptionId: tenant.StripeSubscriptionId,
            WADisplayName: tenant.WADisplayName,
            ClientEmail: tenant.ClientEmail,
            ClientCompanyName: tenant.ClientCompanyName,
          },
          cloudApiRecords: records.map((r) => ({
            _id: r._id,
            TenantId: r.TenantId,
            BMID: r.BMID,
            WABAID: r.WABAID,
            WADisplayName: r.WADisplayName,
            WABAPhoneId: r.WABAPhoneId,
            WABAPhoneNumber: r.WABAPhoneNumber,
            Created: r.Created,
            LastUpdated: r.LastUpdated,
          })),
        });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/onboardingFix/lookup', { err: `${err}` });
    res.status(500).json({ error: 'Internal server error' });
  }
}
