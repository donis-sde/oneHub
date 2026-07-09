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
  BackofficeFeature.CLEAN_CACHE,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { cleanCacheLogDao } = await getServerDiContainer();

      const { skip = 0, limit = 25, ...otherQuery } = req.query;
      console.log(otherQuery);
      const filter = filterQueryParamsParser(otherQuery);
      console.log('req.query', req.query);

      const paginator: Paginator = {
        skip: Number(skip),
        limit: Number(limit),
      };
      if (otherQuery) {
        const { data, count } = await cleanCacheLogDao.list(paginator, filter);
        res.status(200).json({ logs: data, total: count });
      } else {
        const { data, count } = await cleanCacheLogDao.list(paginator);
        res.status(200).json({ logs: data, total: count });
      }
    });
  } catch (error) {
    console.error('Failed to fetch logs', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
