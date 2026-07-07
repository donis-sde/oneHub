import type { NextApiHandler } from 'next';
import { MetaClient } from '../waba/util/metaClient';
import { adminPostOnly } from '../waba/util/rbac';

interface ReqBody {
  wabaId?: string;
  creditLineId?: string;
}

type OwnerBusinessInfoRes = { owner_business_info?: { id?: string } } & Record<
  string,
  unknown
>;

type AllocationRes = { data?: Array<{ id: string }> } & Record<string, unknown>;

const handler: NextApiHandler = async (req, res) => {
  try {
    await adminPostOnly(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { wabaId, creditLineId } = req.body as ReqBody;
      if (!wabaId || !creditLineId) {
        res.status(400).json({ error: 'Missing wabaId or creditLineId' });
        return;
      }

      try {
        const meta = new MetaClient();

        // 1) owner business id
        const owner = await meta.get<OwnerBusinessInfoRes>(`${wabaId}`, {
          fields: 'owner_business_info',
        });
        const clientBusinessId = owner.owner_business_info?.id;
        if (!clientBusinessId) {
          res.status(404).json({ error: 'Client business ID not found' });
          return;
        }

        // 2) allocation config
        const allocation = await meta.get<AllocationRes>(
          `${creditLineId}/owning_credit_allocation_configs`,
          {
            receiving_business_id: String(clientBusinessId),
            fields: 'id,receiving_business',
          },
        );
        const allocationConfigId = allocation.data?.[0]?.id ?? '';
        if (!allocationConfigId) {
          res.status(404).json({ error: 'No allocation config found' });
          return;
        }

        // 3) delete
        await meta.del<Record<string, unknown>>(`${allocationConfigId}`);

        res.status(200).json({ success: true });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Revoke failed';
        // eslint-disable-next-line no-console
        console.error('revokeCreditLine (orchestrator) error:', e);
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
