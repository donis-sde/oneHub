/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Role } from '@/enums/Role';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { sortBy } from 'lodash';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
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
        let { page, limit, order, orderBy, tenant_id } = req.query;
        const { tenantBroadcastRateLimitCollection } =
          await getServerDiContainer();

        const where = {};
        if (tenant_id) {
          where.TenantId = tenant_id;
        }

        const pageNum = parseInt(page) || 0;
        const limitNum = parseInt(limit) || 10;

        const data = await tenantBroadcastRateLimitCollection
          .find(where, {
            skip: pageNum * limitNum,
            limit: limitNum,
            sort: { [orderBy]: order },
          })
          .toArray();

        const total = await tenantBroadcastRateLimitCollection.countDocuments(
          where,
        );

        res.status(200).json({
          result: data.map((item) => ({
            TenantId: item.TenantId,
            RateLimit: item.BroadcastRateLimit.RateLimit,
            UpdatedAt: item.UpdatedAt,
          })),
          total: total,
          page: pageNum,
          limit: limitNum,
        });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryMps error:', error);
    res.status(400).json({ error: error.message });
  }
}
