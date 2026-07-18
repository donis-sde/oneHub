import type { NextApiResponse } from 'next';

import {
  findAstraAccountByEmail,
  lookupAstraOwnership,
} from '@/dataAccess/AstraOwnershipDao';
import { ensureMemberThenTransferOwnership } from '@/lib/astraOwnershipClient';
import { HttpMethod } from '@/enums/HttpMethod';
import { withAstraToolsAccess } from '@/pages/api/astra/_withAstraToolsAccess';

type ChangeOwnershipResponse =
  | {
      success: true;
      tenantId: string;
      clientName: string | null;
      previousOwnerEmail: string | null;
      newOwnerEmail: string;
      invited: boolean;
      inviteStatus: string | null;
      message: string;
    }
  | { error: string };

export default withAstraToolsAccess<ChangeOwnershipResponse>(
  HttpMethod.POST,
  async (req, res: NextApiResponse<ChangeOwnershipResponse>) => {
    const body = (req.body ?? {}) as {
      tenantId?: unknown;
      newOwnerEmail?: unknown;
    };

    const tenantId =
      typeof body.tenantId === 'string' ? body.tenantId.trim() : '';
    const newOwnerEmail =
      typeof body.newOwnerEmail === 'string'
        ? body.newOwnerEmail.trim().toLowerCase()
        : '';

    if (!tenantId) {
      res.status(400).json({ error: 'tenantId is required' });
      return;
    }
    if (!newOwnerEmail || !newOwnerEmail.includes('@')) {
      res.status(400).json({ error: 'A valid new owner email is required' });
      return;
    }

    const current = await lookupAstraOwnership(tenantId);
    if (!current.found) {
      res.status(404).json({ error: current.message });
      return;
    }
    if (!current.ownerEmail) {
      res.status(400).json({ error: 'No current owner found for this tenant' });
      return;
    }
    if (current.ownerEmail.toLowerCase() === newOwnerEmail) {
      res.status(400).json({
        error: 'New owner email is already the current owner',
      });
      return;
    }

    const account = await findAstraAccountByEmail(newOwnerEmail, tenantId);
    if (!account) {
      res.status(400).json({
        error:
          'This email is not registered in Astra. The user must create an Astra account first, then retry.',
      });
      return;
    }

    const alreadyMember = Boolean(account.roleInTenant);
    const { invited, inviteStatus } = await ensureMemberThenTransferOwnership({
      tenantId,
      newOwnerEmail: account.email,
      accountId: account.accountId,
      accountName: account.name,
      alreadyMember,
    });

    const after = await lookupAstraOwnership(tenantId);
    if (after.ownerEmail?.toLowerCase() !== account.email.toLowerCase()) {
      res.status(500).json({
        error:
          'Ownership update did not confirm. Refresh and verify the tenant owner in Account Details.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      tenantId,
      clientName: after.clientName,
      previousOwnerEmail: current.ownerEmail,
      newOwnerEmail: after.ownerEmail,
      invited,
      inviteStatus,
      message: `Ownership transferred from ${current.ownerEmail} to ${after.ownerEmail}.`,
    });
  },
);
