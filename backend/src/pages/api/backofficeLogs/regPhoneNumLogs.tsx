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

// Use your dedicated feature if present; otherwise reuse a known one.
const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.META_REGISTER_NUMBER ?? BackofficeFeature.META_BMID_CHECK,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { regPhoneNumLogDao } = await getServerDiContainer();

      const { skip = 0, limit = 25, ...otherQuery } = req.query as any;
      const filter = filterQueryParamsParser(otherQuery);

      const paginator: Paginator = {
        skip: Number(skip),
        limit: Number(limit),
      };

      const { data, count } = Object.keys(otherQuery).length
        ? await regPhoneNumLogDao.list(paginator, filter)
        : await regPhoneNumLogDao.list(paginator);

      res.status(200).json({ logs: data, total: count });
    });
  } catch (error) {
    console.error('Failed to fetch regPhoneNum logs', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
