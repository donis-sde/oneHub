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
        let { partner_id } = req.query;
        const { prmGatewayDao } = await getServerDiContainer();

        await prmGatewayDao.forceSyncPartner(partner_id);

        res.status(200).json({ result: 'success' });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryCreditConsumer error:', error);
    res.status(400).json({ error: error.message });
  }
}
