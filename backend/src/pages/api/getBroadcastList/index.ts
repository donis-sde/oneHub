/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.GET }, // Allow only admin users to access this endpoint
];

const WATI_BE_SERVER_URL = process.env.WATI_MT_SERVER_URL;
const WATI_BE_SERVER_URL_API_KEY = process.env.WATI_BE_SERVER_URL_API_KEY;

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.STOP_BROADCAST,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      const { tenantId, keyword } = req.query;
      console.log(tenantId);
      console.log(keyword);

      const stopRetriesUrl = `${WATI_BE_SERVER_URL}/${tenantId}/api/v2/backoffice-portal/broadcast-list`;
      const apiResponse = await fetch(stopRetriesUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          PricingApiKey: `${WATI_BE_SERVER_URL_API_KEY}`,
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          broadcast_name: keyword,
        }),
      });

      if (apiResponse.status != 200) {
        res
          .status(apiResponse.status)
          .json({ message: 'Failed to stop broadcast retries' });
        return;
      }

      const responseData = await apiResponse.json();
      if (!responseData.ok) {
        res.status(400).json({ message: responseData.message });
        return;
      }

      res.status(200).json({ data: responseData });
    });
  } catch (error) {
    console.error('Failed to fetch logs', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
}
