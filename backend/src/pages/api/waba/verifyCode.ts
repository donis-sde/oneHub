import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';

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
      const code = req.body.code as string;
      const accessToken = process.env.FB_TOKEN;

      // Validation
      if (!phoneNumId) {
        return res.status(400).json({ error: 'Missing phoneNumberId in body' });
      }

      if (!code || !/^\d{6}$/.test(code)) {
        return res
          .status(400)
          .json({ error: 'Invalid or missing code. Must be a 6-digit number' });
      }

      try {
        const url = `${META_GRAPH_API_BASE}/${phoneNumId}/verify_code`;

        const payload = {
          code: code,
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

        if (!response.ok) {
          return res.status(response.status).json({
            error: data.error?.message || 'Failed to verify code',
          });
        }

        return res.status(200).json({
          success: true,
          message: 'Phone number verified successfully',
        });
      } catch (err) {
        console.error(
          `Error verifying code for phone number ID [${phoneNumId}]:`,
          err,
        );
        return res
          .status(500)
          .json({ error: 'Internal Server Error while verifying code' });
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
