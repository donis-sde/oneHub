/* eslint-disable */
// @ts-nocheck
import { MongoClient } from 'mongodb';
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { getServerDiContainer } from '@/global/serverDiContainer';

const rbacRules = [
  {
    roles: null,
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.WATI_CUSTOMER_STATUS,
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
        let { q } = req.query;
        if (!q) {
          res.status(400).json({ error: 'query is required' });
          return;
        }
        const { watiStatesDao } = await getServerDiContainer();
        const data = await watiStatesDao.list(
          {},
          {
            display_phone_number: q,
          },
        );
        res.status(200).json({
          result: {
            ...data,
            data: data.data.map((item) => ({
              ...item,
            })),
          },
        });
      },
    ])(req, res);
  } catch (error) {
    console.error('queryWatiStates error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
