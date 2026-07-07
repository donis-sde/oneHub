// File: /pages/api/waba/getCreditLines.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { RemoveCreditLineLog } from '@/dataAccess/models/RemoveCreditLineLog';

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v23.0';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.META_REMOVE_CREDIT_LINE,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed. Use GET.' });
      }

      const businessId = req.query.businessId as string;
      const accessToken = process.env.FB_TOKEN;

      if (!businessId) {
        return res.status(400).json({ error: 'Missing businessId in query' });
      }

      const { logger, removeCreditLineLogDao } = await getServerDiContainer();

      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'revokeCreditLine',
        API: 'RemoveCreditLine',
      };

      const user = extractUserFromHeaders(req.headers, loggerMetadata, logger);
      const loggedInUserEmail = user?.email ?? 'unknown';

      try {
        const url = `${META_GRAPH_API_BASE}/${businessId}/extendedcredits?fields=id,legal_entity_name&access_token=${accessToken}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        await removeCreditLineLogDao.insertMany([
          new RemoveCreditLineLog(loggedInUserEmail, new Date()),
        ]);

        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Failed to fetch credit lines',
          });
        }

        return res.status(200).json({ creditLines: data.data || [] });
      } catch (err) {
        logger.error('REMOVE_CREDIT_LINE_FAILED', {
          err,
          loggerMetadata,
        });
        console.error('Error fetching credit lines:', err);
        return res
          .status(500)
          .json({ error: 'Internal Server Error while fetching credit lines' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
