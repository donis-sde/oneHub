import type { NextApiResponse } from 'next';

import { lookupAstraOwnership } from '@/dataAccess/AstraOwnershipDao';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type OwnershipLookupResponse =
  | Awaited<ReturnType<typeof lookupAstraOwnership>>
  | { error: string };

export default withAstraToolsAccess<OwnershipLookupResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<OwnershipLookupResponse>) => {
    const tenantIdRaw = req.query.tenantId;
    const tenantId =
      typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const data = await lookupAstraOwnership(tenantId);
    res.status(200).json(data);
  },
);
