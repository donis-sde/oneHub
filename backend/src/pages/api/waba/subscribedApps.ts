import type { NextApiHandler } from 'next';
import { MetaClient } from './util/metaClient';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';

interface ReqBody {
  wabaId?: string;
}

type SubscribedAppsRes = {
  data?: Array<Record<string, unknown>>;
} & Record<string, unknown>;

type SubscribeRes = {
  success?: boolean;
} & Record<string, unknown>;

const rbacMiddleware = createRbacMiddleware(
  [
    { roles: [Role.ADMIN], httpMethod: HttpMethod.GET },
    { roles: [Role.ADMIN], httpMethod: HttpMethod.POST },
  ],
  BackofficeFeature.META_SUBSCRIBED_APPS,
);

const handler: NextApiHandler = async (req, res) => {
  try {
    await rbacMiddleware(req, res, async () => {
      if (req.method === 'GET') {
        const wabaId = req.query['wabaId'] as string | undefined;
        if (!wabaId) {
          res.status(400).json({ error: 'Missing wabaId query parameter' });
          return;
        }

        if (!/^\d+$/.test(wabaId)) {
          res.status(400).json({ error: 'Invalid wabaId format' });
          return;
        }

        try {
          const meta = new MetaClient();
          const data = await meta.get<SubscribedAppsRes>(
            `${wabaId}/subscribed_apps`,
          );
          res.status(200).json({ subscribedApps: data });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Failed to fetch subscribed apps';
          // eslint-disable-next-line no-console
          console.error('getSubscribedApps error:', e);
          res.status(502).json({ error: message });
        }
        return;
      }

      if (req.method === 'POST') {
        const { wabaId } = req.body as ReqBody;
        if (!wabaId) {
          res.status(400).json({ error: 'Missing wabaId' });
          return;
        }

        if (!/^\d+$/.test(wabaId)) {
          res.status(400).json({ error: 'Invalid wabaId format' });
          return;
        }

        try {
          const meta = new MetaClient();
          const data = await meta.post<SubscribeRes>(
            `${wabaId}/subscribed_apps`,
          );
          res.status(200).json({ result: data });
        } catch (e) {
          const message =
            e instanceof Error ? e.message : 'Failed to subscribe app';
          // eslint-disable-next-line no-console
          console.error('postSubscribedApps error:', e);
          res.status(502).json({ error: message });
        }
        return;
      }

      res.status(405).json({ error: 'Method Not Allowed' });
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('RBAC error:', e);
    res.status(403).json({ error: 'Forbidden' });
  }
};

export default handler;
