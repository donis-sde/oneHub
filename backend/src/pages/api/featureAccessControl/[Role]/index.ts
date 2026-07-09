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
    const { Role } = req.query;
    console.log('role', Role);
    if (typeof Role !== 'string') {
      return res.status(404).json({ error: 'bad request' });
    }
    await rbacMiddleware(req, res, async () => {
      const { featureAccessControlDao } = await getServerDiContainer();
      // console.log(req);
      if (req.method === HttpMethod.GET) {
        try {
          console.log('role');
          const roleData = await featureAccessControlDao.getByRole(Role);
          if (roleData) {
            res.status(200).json(roleData);
          } else {
            res.status(404).json({ error: 'Role not found' });
          }
        } catch (error) {
          res.status(500).json({ error: 'Failed to fetch role' });
        }
      } else if (req.method === HttpMethod.PATCH) {
        try {
          const { features } = req.body;
          console.log('f------->>>>>', features);
          await featureAccessControlDao.updateByRole(Role, features);
          res.status(200).json({ message: 'Role updated successfully' });
        } catch (error) {
          console.error('Failed to update role', error);
          res.status(500).json({ error: 'Failed to update role' });
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
