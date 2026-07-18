import type { NextApiResponse } from 'next';

import { getAstraAccountDetails } from '@/dataAccess/AstraAccountDetailsDao';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type AccountDetailsResponse =
  | Awaited<ReturnType<typeof getAstraAccountDetails>>
  | { error: string };

export default withAstraToolsAccess<AccountDetailsResponse>(
  HttpMethod.GET,
  async (req, res: NextApiResponse<AccountDetailsResponse>) => {
    const tenantIdRaw = req.query.tenantId;
    const tenantId =
      typeof tenantIdRaw === 'string' ? tenantIdRaw.trim() : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }

    const data = await getAstraAccountDetails(tenantId);
    res.status(200).json(data);
  },
);
