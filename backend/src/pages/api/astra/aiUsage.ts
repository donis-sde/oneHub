import type { NextApiResponse } from 'next';

import { getAiUsageForTenant } from '@/dataAccess/AstraUsageDao';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type AiUsageResponse =
  | Awaited<ReturnType<typeof getAiUsageForTenant>>
  | { error: string };

export default withAstraToolsAccess<AiUsageResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<AiUsageResponse>) => {
    const tenantIdRaw = req.query.tenantId;
    const tenantId = typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const data = await getAiUsageForTenant(tenantId);
    res.status(200).json(data);
  },
);
