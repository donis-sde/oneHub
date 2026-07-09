import type { NextApiHandler } from 'next';
import { MetaClient } from '../waba/util/metaClient';
import { adminPostOnly } from '../waba/util/rbac';

interface OwnerBusinessInfoRes {
  owner_business_info?: { id?: string; [k: string]: unknown };
  [k: string]: unknown;
}

interface ReqBody {
  wabaId?: string;
}

interface SuccessPayload {
  clientBusinessId: string;
  raw: OwnerBusinessInfoRes;
}

const handler: NextApiHandler = async (req, res) => {
  try {
    await adminPostOnly(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { wabaId } = req.body as ReqBody;
      if (!wabaId) {
        res.status(400).json({ error: 'Missing wabaId' });
        return;
      }

      try {
        const meta = new MetaClient();
        const data = await meta.get<OwnerBusinessInfoRes>(`${wabaId}`, {
          fields: 'owner_business_info',
        });

        const clientBusinessId = data.owner_business_info?.id;
        if (!clientBusinessId) {
          res.status(404).json({ error: 'Client business ID not found' });
          return;
        }

        const payload: SuccessPayload = { clientBusinessId, raw: data };
        res.status(200).json(payload);
      } catch (e) {
        // e is unknown by default in TS; keep it that way and message safely
        const message =
          e instanceof Error
            ? e.message
            : 'Failed to fetch owner business info';
        // eslint-disable-next-line no-console
        console.error('getOwnerBusinessInfo error:', e);
        res.status(502).json({ error: message });
      }
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('RBAC error:', e);
    res.status(403).json({ error: 'Forbidden' });
  }
};

export default handler;
