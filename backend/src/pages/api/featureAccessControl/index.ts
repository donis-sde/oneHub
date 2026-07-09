/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { Paginator } from '@/types/Pagination';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.GET },
  { roles: [Role.ADMIN], httpMethod: HttpMethod.POST }, // Allow only admin users to access this endpoint
  { roles: [Role.ADMIN], httpMethod: HttpMethod.PATCH },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.FEATURE_ACCESS_CONTROL,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { featureAccessControlDao } = await getServerDiContainer();
      // console.log(req);
      console.log('req-->>', req.body);
      if (req.method === HttpMethod.GET) {
        try {
          console.log('in get-->>', req.body);
          const roleData = await featureAccessControlDao.list({
            skip: 0,
            limit: 100,
          });
          if (roleData) {
            res.status(200).json(roleData?.data);
          } else {
            res.status(404).json({ error: 'Role not found' });
          }
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch role' });
        }
      } else if (req.method === HttpMethod.POST) {
        try {
          const { role, features } = req.body;
          await featureAccessControlDao.insertMany([{ role, features }]);
          res.status(201).json({ message: 'Role added successfully' });
        } catch (error) {
          console.error('Failed to add role', error);
          res.status(500).json({ error: 'Failed to add role' });
        }
      } else {
        res.status(405).json({ error: 'Method not allowed' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware failed', error);
    res.status(500).json({ error: 'RBAC middleware failed' });
  }
}
