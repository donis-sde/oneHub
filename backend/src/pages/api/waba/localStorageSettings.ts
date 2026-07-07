import type { NextApiHandler } from 'next';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';

type StorageAction = 'enable' | 'disable';

interface ReqBody {
  phoneNumberId?: string;
  action?: StorageAction;
  countryCode?: string;
}

type StorageSettingsRes = Record<string, unknown>;

const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

const SUPPORTED_COUNTRY_CODES = [
  'AE',
  'AU',
  'BH',
  'BR',
  'CA',
  'CH',
  'DE',
  'GB',
  'ID',
  'IN',
  'JP',
  'KR',
  'SG',
  'ZA',
];

const rbacMiddleware = createRbacMiddleware(
  [{ roles: [Role.ADMIN], httpMethod: HttpMethod.POST }],
  BackofficeFeature.META_LOCAL_STORAGE,
);

const handler: NextApiHandler = async (req, res) => {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { phoneNumberId, action, countryCode } = req.body as ReqBody;

      if (
        typeof phoneNumberId !== 'string' ||
        !/^\d{1,30}$/.test(phoneNumberId)
      ) {
        res.status(400).json({
          error: 'Invalid phoneNumberId',
        });
        return;
      }

      if (!action || !['enable', 'disable'].includes(action)) {
        res.status(400).json({
          error: 'Missing or invalid action. Must be "enable" or "disable"',
        });
        return;
      }

      if (action === 'enable') {
        if (!countryCode) {
          res.status(400).json({
            error: 'countryCode is required when enabling local storage',
          });
          return;
        }

        if (!SUPPORTED_COUNTRY_CODES.includes(countryCode.toUpperCase())) {
          res.status(400).json({
            error: `Unsupported country code "${countryCode}". Supported: ${SUPPORTED_COUNTRY_CODES.join(
              ', ',
            )}`,
          });
          return;
        }
      }

      const accessToken = process.env.FB_TOKEN;

      if (!accessToken) {
        res.status(500).json({
          error: 'FB_TOKEN is not configured',
        });
        return;
      }

      const storageConfiguration =
        action === 'enable'
          ? {
              status: 'IN_COUNTRY_STORAGE_ENABLED',
              data_localization_region: countryCode?.toUpperCase(),
            }
          : {
              status: 'IN_COUNTRY_STORAGE_DISABLED',
            };

      try {
        const safePhoneNumberId = encodeURIComponent(phoneNumberId);

        const url = `${META_GRAPH_API_BASE}/${safePhoneNumberId}/settings`;

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            storage_configuration: storageConfiguration,
          }),
        });

        const data = (await response.json()) as StorageSettingsRes;

        if (!response.ok) {
          return res.status(response.status).json({
            error:
              (data as { error?: { message?: string } }).error?.message ??
              'Meta API request failed',
            raw: data,
          });
        }

        return res.status(200).json({
          success: true,
          raw: data,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Request failed';

        // eslint-disable-next-line no-console
        console.error('localStorageSettings error:', e);

        return res.status(502).json({
          error: message,
        });
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('RBAC error:', e);

    res.status(403).json({
      error: 'Forbidden',
    });
  }
};

export default handler;
