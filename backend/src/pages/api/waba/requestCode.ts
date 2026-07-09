import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { GetOtpLog } from '@/dataAccess/models/GetOtpLog';

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
  BackofficeFeature.META_OTP_CODE,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        return res
          .status(405)
          .json({ error: 'Method Not Allowed. Use POST instead' });
      }

      const phoneNumId = req.body.phoneNumberId as string;
      const codeMethod = req.body.codeMethod as string;
      const language = req.body.language as string;
      const accessToken = process.env.FB_TOKEN;

      if (!phoneNumId) {
        return res.status(400).json({ error: 'Missing phoneNumId in body' });
      }

      if (!codeMethod || !['SMS', 'VOICE'].includes(codeMethod.toUpperCase())) {
        return res.status(400).json({
          error: 'Invalid or missing codeMethod. Use either "SMS" or "VOICE"',
        });
      }

      if (!language || language.length !== 2) {
        return res.status(400).json({
          error:
            'Invalid or missing language. Use a valid 2-letter language code like "en", "id", etc.',
        });
      }
      const { logger, getOtpLogDao } = await getServerDiContainer();

      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'handler',
        API: 'GetOtp',
      };
      const user = extractUserFromHeaders(req.headers, loggerMetadata, logger);
      const loggedInUserEmail = user?.email ?? 'unknown';

      try {
        const url = `${META_GRAPH_API_BASE}/${phoneNumId}/request_code`;

        const payload = {
          code_method: codeMethod.toUpperCase(),
          language: language,
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

        await getOtpLogDao.insertMany([
          new GetOtpLog(loggedInUserEmail, new Date()),
        ]);

        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Failed to Request Code',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Verification code requested successfully',
        });
      } catch (err) {
        console.error(
          `Error requesting code from phone number ID [${phoneNumId}]:`,
          err,
        );
        return res
          .status(500)
          .json({ error: 'Internal Server Error while requesting code' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
