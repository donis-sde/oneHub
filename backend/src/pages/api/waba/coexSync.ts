import type { NextApiHandler } from 'next';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';

type SyncType = 'smb_app_state_sync' | 'history';

interface ReqBody {
  phoneNumberId?: string;
  syncType?: SyncType;
}

type MetaResponse = Record<string, unknown>;

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

const rbacMiddleware = createRbacMiddleware(
  [{ roles: [Role.ADMIN], httpMethod: HttpMethod.POST }],
  BackofficeFeature.META_COEX_SYNC,
);

const VALID_SYNC_TYPES: SyncType[] = ['smb_app_state_sync', 'history'];

const handler: NextApiHandler = async (req, res) => {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { phoneNumberId, syncType } = req.body as ReqBody;

      if (!phoneNumberId) {
        res.status(400).json({ error: 'Missing phoneNumberId' });
        return;
      }

      if (!/^\d+$/.test(phoneNumberId)) {
        res.status(400).json({ error: 'Invalid phoneNumberId format' });
        return;
      }

      if (!syncType || !VALID_SYNC_TYPES.includes(syncType)) {
        res.status(400).json({
          error: `Missing or invalid syncType. Must be one of: ${VALID_SYNC_TYPES.join(
            ', ',
          )}`,
        });
        return;
      }

      const accessToken = process.env.FB_TOKEN;

      if (!accessToken) {
        res.status(500).json({
          error: 'FB_TOKEN is not configured',
        });
        return;
      }

      try {
        const safePhoneNumberId = encodeURIComponent(phoneNumberId);
        const url = `${META_GRAPH_API_BASE}/${safePhoneNumberId}/smb_app_data`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            sync_type: syncType,
          }),
        });

        const data = (await response.json()) as MetaResponse;

        if (!response.ok) {
          return res.status(response.status).json(data);
        }

        return res.status(200).json(data);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Coex sync request failed';
        // eslint-disable-next-line no-console
        console.error('coexSync error:', e);
        return res.status(502).json({ error: message });
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('RBAC error:', e);
    res.status(403).json({ error: 'Forbidden' });
  }
};

export default handler;
