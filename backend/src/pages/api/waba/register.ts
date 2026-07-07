import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { RegPhoneNumLog } from '@/dataAccess/models/RegPhoneNumLog';

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

// Define your RBAC rules
const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.POST,
  },
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.META_REGISTER_NUMBER,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed, use POST' });
      }

      const phoneNumber = req.body.phoneNumber as string;
      const pinCode = req.body.pinCode as string;
      const accessToken = process.env.FB_TOKEN;

      if (!phoneNumber) {
        return res
          .status(400)
          .json({ error: 'Missing Phone Number in the request' });
      }
      if (!pinCode) {
        return res
          .status(400)
          .json({ error: 'Missing PIN Code in the request' });
      }

      const { logger, regPhoneNumLogDao } = await getServerDiContainer();
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'handler',
        API: 'RegisterPhoneNumber',
      };
      const user = extractUserFromHeaders(req.headers, loggerMetadata, logger);
      const loggedInUserEmail = user?.email ?? 'unknown';

      try {
        const url = `${META_GRAPH_API_BASE}/${phoneNumber}/register`;
        const payload = {
          messaging_product: 'whatsapp',
          pin: `${pinCode}`,
        };
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        await regPhoneNumLogDao.insertMany([
          new RegPhoneNumLog(loggedInUserEmail, new Date()),
        ]);

        if (!response.ok) {
          return res.status(response.status).json({
            error:
              data.error?.message || 'Error When calling Register META API',
          });
        }
        return res
          .status(200)
          .json({ success: true, message: 'Registered successfully' });
      } catch (err) {
        logger.error('REGISTER_PHONE_NUM_FAILED', {
          err,
          loggerMetadata,
        });
        console.error('Meta register failed:', err);
        return res.status(500).json({
          error:
            err ||
            'Internal Server error occured when calling register META API',
        });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
