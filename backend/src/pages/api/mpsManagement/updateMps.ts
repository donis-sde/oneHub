/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Role } from '@/enums/Role';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { sortBy } from 'lodash';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.PUT,
  }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.MPS_MANAGEMENT,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await middlewareFlattener([
      rbacMiddleware,
      createLogContextMiddleware(),
      async (req: NextApiRequest, res: NextApiResponse) => {
        let { tenant_id, rate_limit } = req.body;
        if (!tenant_id) {
          return res.status(400).json({ error: 'Tenant ID is required' });
        }
        if (rate_limit < 1 || rate_limit > 200) {
          return res
            .status(400)
            .json({ error: 'Rate limit must be between 1 and 200' });
        }
        const { tenantBroadcastRateLimitCollection, mpsAuditLogCollection } =
          await getServerDiContainer();

        const where = {};
        if (tenant_id) {
          where.TenantId = tenant_id;
        }

        const DEFAULT_SIZE_LIMIT = 100000;

        const data = await tenantBroadcastRateLimitCollection.findOneAndUpdate(
          where,
          {
            $set: {
              TenantId: tenant_id,
              BroadcastRateLimit: {
                RateLimit: rate_limit,
                SizeLimit: DEFAULT_SIZE_LIMIT,
              },
              UpdatedAt: new Date(),
            },
          },
          { returnDocument: 'before', upsert: true },
        );

        const user = extractUserFromHeaders(req.headers, null, null);

        await mpsAuditLogCollection.insertOne({
          tenant_id: tenant_id,
          old: data.value
            ? { RateLimit: data.value.BroadcastRateLimit.RateLimit }
            : {},
          new: { RateLimit: rate_limit },
          executed_by: user.email,
          created_at: new Date(),
        });

        res.status(200).json({ result: 'success' });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryMps error:', error);
    res.status(400).json({ error: error.message });
  }
}
