/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { Paginator } from '@/types/Pagination';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { filterQueryParamsParser } from '@/utils/mongooseUtils';

const rbacRules = [{ roles: [Role.ADMIN], httpMethod: HttpMethod.GET }];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.META_GET_PHONE_NUMBER,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { getPhoneNumLogDao } = await getServerDiContainer();
      const { skip = 0, limit = 25, ...otherQuery } = req.query;

      const filter = filterQueryParamsParser(otherQuery);
      const paginator: Paginator = {
        skip: Number(skip),
        limit: Number(limit),
      };

      const { data, count } = await getPhoneNumLogDao.list(paginator, filter);
      res.status(200).json({ logs: data, total: count });
    });
  } catch (error) {
    console.error('Failed to fetch phone number logs', error);
    res.status(500).json({ error: 'Failed to fetch phone number logs' });
  }
}
