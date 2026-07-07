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
  BackofficeFeature.PRM_GATEWAY,
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
        let {
          partner_id,
          customer_id,
          customer_email,
          orderBy,
          order,
          page,
          limit,
        } = req.query;
        if (!partner_id) {
          return res.status(400).json({ error: 'partner_id is required' });
        }
        const { prmGatewayDao } = await getServerDiContainer();

        const { total, data } = await prmGatewayDao.listCustomers(
          {
            skip: page <= 0 ? 0 : page * limit,
            limit: limit,
          },
          {
            partner_id: partner_id,
            customer_id: customer_id,
            customer_email: customer_email,
          },
          orderBy
            ? {
                [orderBy]: order,
              }
            : undefined,
        );

        res
          .status(200)
          .json({ result: data, total: total, page: page, limit: limit });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryCreditConsumer error:', error);
    res.status(403).json({ error: error.message });
  }
}
