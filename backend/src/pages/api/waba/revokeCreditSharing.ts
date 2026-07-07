import type { NextApiHandler } from 'next';
import { MetaClient } from '../waba/util/metaClient';
import { adminPostOnly } from '../waba/util/rbac';

interface ReqBody {
  allocationConfigId?: string;
}

interface SuccessPayload {
  success: true;
  raw: Record<string, unknown>;
}

const handler: NextApiHandler = async (req, res) => {
  try {
    await adminPostOnly(req, res, async () => {
      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed, use POST' });
        return;
      }

      const { allocationConfigId } = req.body as ReqBody;
      if (!allocationConfigId) {
        res.status(400).json({ error: 'Missing allocationConfigId' });
        return;
      }

      try {
        const meta = new MetaClient();
        const raw = await meta.del<Record<string, unknown>>(
          `${allocationConfigId}`,
        );
        const payload: SuccessPayload = { success: true, raw };
        res.status(200).json(payload);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to revoke credit line';
        // eslint-disable-next-line no-console
        console.error('revokeCreditSharing error:', e);
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
