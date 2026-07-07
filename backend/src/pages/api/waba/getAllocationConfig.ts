import type { NextApiHandler } from 'next';
import { MetaClient } from './util/metaClient';
import { adminPostOnly } from './util/rbac';

interface AllocationConfigItem {
  id: string;
  receiving_business?: unknown;
}

interface AllocationConfigsRes {
  data?: AllocationConfigItem[];
  [k: string]: unknown;
}

interface ReqBody {
  creditLineId?: string;
  clientBusinessId?: string;
}

interface SuccessPayload {
  allocationConfigId: string;
  raw: AllocationConfigsRes;
}

const handler: NextApiHandler = async (req, res) => {
  try {
    await adminPostOnly(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { creditLineId, clientBusinessId } = req.body as ReqBody;
      if (!creditLineId || !clientBusinessId) {
        res
          .status(400)
          .json({ error: 'Missing creditLineId or clientBusinessId' });
        return;
      }

      try {
        const meta = new MetaClient();
        const data = await meta.get<AllocationConfigsRes>(
          `${creditLineId}/owning_credit_allocation_configs`,
          {
            receiving_business_id: clientBusinessId,
            fields: 'id,receiving_business',
          },
        );

        const allocationConfigId = data.data?.[0]?.id ?? '';
        if (!allocationConfigId) {
          res.status(404).json({ error: 'No allocation config found' });
          return;
        }

        const payload: SuccessPayload = { allocationConfigId, raw: data };
        res.status(200).json(payload);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to fetch allocation config';
        // eslint-disable-next-line no-console
        console.error('getAllocationConfig error:', e);
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
