import { NextApiRequest, NextApiResponse } from 'next';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { GetBmidLog } from '@/dataAccess/models/GetBmidLog';

const _META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.META_BMID_CHECK,
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

      const wabaId = req.query.wabaId as string;
      const accessToken = process.env.FB_TOKEN;

      if (!wabaId) {
        return res.status(400).json({ error: 'Missing wabaId in query' });
      }

      const { logger, getBmidLogDao } = await getServerDiContainer();
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'handler',
        API: 'GetBMID',
      };

      const user = extractUserFromHeaders(req.headers, loggerMetadata, logger);
      const loggedInUserEmail = user?.email ?? 'unknown';

      try {
        const url = `${_META_GRAPH_API_BASE}/${wabaId}?fields=owner_business_info&access_token=${accessToken}`;

        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        const data = await response.json();
        await getBmidLogDao.insertMany([
          new GetBmidLog(loggedInUserEmail, new Date()),
        ]);

        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Failed to fetch owner business info',
          });
        }

        const ownerInfo = data.owner_business_info;

        if (!ownerInfo?.id) {
          return res
            .status(404)
            .json({ error: 'BMID not found. Possibly unshared WABA.' });
        }

        return res
          .status(200)
          .json({ bmid: ownerInfo.id, name: ownerInfo.name });
      } catch (err) {
        logger.error('BMID_FETCH_ERROR', {
          err,
          loggerMetadata,
        });
        console.error('Error fetching BMID from WABA:', err);
        return res
          .status(500)
          .json({ error: 'Internal Server Error while fetching BMID' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
