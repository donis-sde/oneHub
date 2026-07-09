import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { GetPhoneNumLog } from '@/dataAccess/models/GetPhoneNumLog';

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  },
];

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
      if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed, use GET' });
      }

      const wabaId = req.query.wabaId as string;
      const accessToken = process.env.FB_TOKEN;
      if (!wabaId) {
        return res.status(400).json({ error: 'Missing WABA Id in query' });
      }

      const { logger, getPhoneNumLogDao } = await getServerDiContainer();

      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'handler',
        API: 'GetPhoneNumbers',
      };

      const user = extractUserFromHeaders(req.headers, loggerMetadata, logger);
      const loggedInUserEmail = user?.email ?? 'unknown';

      try {
        const url = `${META_GRAPH_API_BASE}/${wabaId}/phone_numbers?access_token=${accessToken}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        await getPhoneNumLogDao.insertMany([
          new GetPhoneNumLog(loggedInUserEmail, new Date()),
        ]);

        if (!response.ok) {
          return res.status(response.status).json({
            error:
              data.error?.message ||
              'Error when calling phone-numbers META API',
          });
        }

        return res.status(200).json({ phoneNumbers: data.data || [] });
      } catch (err) {
        logger.error('META_PHONE_FETCH_ERROR', {
          err,
          loggerMetadata,
        });
        console.error('Meta phone number fetch failed:', err);
        return res.status(500).json({
          error:
            err ||
            'Internal Server error occured when calling phone-numbers META API',
        });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
