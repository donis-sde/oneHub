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
import { Subscription } from '@/dataAccess/models/PrmGateway';
import { TenantDto } from '@/dataAccess/models/Tenant';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.PRM_GATEWAY,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const defaultSubscriptionEnv =
    process.env.PRM_GATEWAY_DEFAULT_SUBSCRIPTION_ENV;
  try {
    await middlewareFlattener([
      rbacMiddleware,
      createLogContextMiddleware(),
      async (req: NextApiRequest, res: NextApiResponse) => {
        let {
          partner_id,
          customer_id,
          subscription_id,
          orderBy,
          order,
          page,
          limit,
        } = req.query;
        if (!partner_id) {
          return res.status(400).json({ error: 'partner_id is required' });
        }
        const { prmGatewayDao, tenantDao } = await getServerDiContainer();

        const { total, data } = await prmGatewayDao.listSubscriptions(
          {
            skip: page <= 0 ? 0 : page * limit,
            limit: limit,
          },
          {
            partner_id: partner_id,
            customer_id: customer_id,
            subscription_id: subscription_id,
          },
          orderBy
            ? {
                [orderBy]: order,
              }
            : undefined,
        );

        if (total != 0) {
          res
            .status(200)
            .json({ result: data, total: total, page: page, limit: limit });
          return;
        }

        // fallback to query tenant db
        let customerIDs: string[] = [];
        if (!customer_id) {
          const { data: customers } = await prmGatewayDao.listCustomers(
            {},
            {
              partner_id: partner_id,
            },
          );
          customerIDs = customers.map((customer) => customer.customer_id);
        } else {
          customerIDs = [customer_id];
        }
        const filter = {
          StripeCustomerId: { $in: customerIDs },
        };
        if (subscription_id) {
          filter.StripeSubscriptionId = subscription_id;
        }
        const tenants = await tenantDao.list(
          { skip: page <= 0 ? 0 : page * limit, limit: limit },
          filter,
        );

        let subscriptions = tenants.data.map(
          (tenant: TenantDto): Subscription => {
            return {
              id: tenant._id,
              partner_id: partner_id,
              customer_id: tenant.StripeCustomerId,
              subscription_id: tenant.StripeSubscriptionId,
              env: defaultSubscriptionEnv,
            };
          },
        );

        res.status(200).json({
          result: subscriptions,
          total: tenants.count,
          page: page,
          limit: limit,
        });
      },
    ])(req, res);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(403).json({ error: error.message });
  }
}
