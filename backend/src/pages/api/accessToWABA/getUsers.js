/* eslint-disable */
// @ts-nocheck
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { BackofficeFeature } from '../../../enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.ACCESS_TO_WABA,
);

export default async function handler(
  req = NextApiRequest,
  res = NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const accessToken = process.env.FB_TOKEN;
      const FB_BUSINESS_ID = process.env.FB_BUSINESS_ID;
      const FB_WABA_ID = process.env.FB_WABA_ID;
      try {
        const response = await fetch(
          `https://graph.facebook.com/v23.0/${FB_WABA_ID}/assigned_users?business=${FB_BUSINESS_ID}&access_token=${accessToken}&limit=100`,
        );

        const data = await response.json();

        if (response.ok) {
          res.status(200).json(data);
        } else {
          res.status(response.status).json(data);
        }
      } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
