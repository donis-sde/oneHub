import type { NextApiResponse } from 'next';

import { lookupAstraTrial } from '@/dataAccess/AstraTrialDao';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type TrialResponse =
  | Awaited<ReturnType<typeof lookupAstraTrial>>
  | { error: string };

export default withAstraToolsAccess<TrialResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<TrialResponse>) => {
    const tenantIdRaw = req.query.tenantId;
    const tenantId =
      typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const data = await lookupAstraTrial(tenantId);
    res.status(200).json(data);
  },
);
