type InviteResult = {
  email: string;
  status: string;
  message?: string;
  invite_url?: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} is not configured. Set it in backend/.env.local to use Change Ownership.`,
    );
  }
  return value;
}

function gatewayBase(): string {
  return (
    process.env.ASTRA_GATEWAY_URL?.trim() || 'https://astra-gateway.wati.io'
  ).replace(/\/$/, '');
}

function difyBase(): string {
  return (
    process.env.ASTRA_DIFY_CONSOLE_URL?.trim() ||
    'https://dify.wati-assets.io'
  ).replace(/\/$/, '');
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function inviteTokenFromUrl(inviteUrl: string | undefined): string | null {
  if (!inviteUrl) return null;
  try {
    const url = new URL(inviteUrl);
    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

export async function inviteTenantMember(params: {
  tenantId: string;
  email: string;
  role?: 'admin' | 'normal';
}): Promise<{ inviteUrl: string | null; status: string; message: string }> {
  const key = requireEnv('ASTRA_INTERNAL_KEY');
  const role = params.role ?? 'admin';
  const res = await fetch(
    `${gatewayBase()}/account/internal/v1/tenants/${encodeURIComponent(params.tenantId)}/members/invite`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails: [params.email], role }),
    },
  );
  const body = (await readJson(res)) as {
    message?: string;
    invitation_results?: InviteResult[];
  } | null;

  if (!res.ok) {
    throw new Error(
      body && typeof body === 'object' && 'message' in body && body.message
        ? String(body.message)
        : `Invite failed (${res.status})`,
    );
  }

  const result = body?.invitation_results?.[0];
  const status = result?.status ?? 'unknown';
  if (status === 'failed') {
    throw new Error(result?.message || `Invite failed for ${params.email}`);
  }

  return {
    inviteUrl: result?.invite_url ?? null,
    status,
    message: result?.message || `Invite ${status}`,
  };
}

export async function acceptTenantInvite(params: {
  token: string;
  name: string;
}): Promise<void> {
  // Existing accounts keep their password; new ones need one to activate.
  const password =
    process.env.ASTRA_INVITE_ACTIVATE_PASSWORD?.trim() ||
    `OneHub!${Date.now().toString(36)}`;

  const res = await fetch(`${difyBase()}/console/api/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: params.token,
      name: params.name || 'Astra User',
      password,
      interface_language: 'en-US',
      timezone: 'Asia/Hong_Kong',
    }),
  });
  const body = (await readJson(res)) as { message?: string; code?: string } | null;
  if (!res.ok) {
    throw new Error(
      body?.message || `Failed to accept invite (${res.status})`,
    );
  }
}

export async function updateMemberRoleToOwner(params: {
  tenantId: string;
  memberAccountId: string;
}): Promise<void> {
  const consoleToken = requireEnv('ASTRA_DIFY_CONSOLE_TOKEN');
  const res = await fetch(
    `${difyBase()}/console/api/workspaces/current/members/${encodeURIComponent(params.memberAccountId)}/update-role`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${consoleToken}`,
        'Content-Type': 'application/json',
        'X-WORKSPACE-ID': params.tenantId,
      },
      body: JSON.stringify({ role: 'owner' }),
    },
  );
  const body = (await readJson(res)) as { message?: string } | null;
  if (!res.ok) {
    throw new Error(
      body?.message || `Ownership update failed (${res.status})`,
    );
  }
}

export async function ensureMemberThenTransferOwnership(params: {
  tenantId: string;
  newOwnerEmail: string;
  accountId: string;
  accountName: string | null;
  alreadyMember: boolean;
}): Promise<{ invited: boolean; inviteStatus: string | null }> {
  let invited = false;
  let inviteStatus: string | null = null;

  if (!params.alreadyMember) {
    const invite = await inviteTenantMember({
      tenantId: params.tenantId,
      email: params.newOwnerEmail,
      role: 'admin',
    });
    invited = true;
    inviteStatus = invite.status;

    if (invite.status === 'duplicate') {
      // Already a member according to account-service; continue.
    } else {
      const token = inviteTokenFromUrl(invite.inviteUrl ?? undefined);
      if (!token) {
        throw new Error(
          'Invite created but no invite token was returned. Ask the user to accept the invite email, then retry Update.',
        );
      }
      await acceptTenantInvite({
        token,
        name: params.accountName || params.newOwnerEmail.split('@')[0] || 'Astra User',
      });
    }
  }

  await updateMemberRoleToOwner({
    tenantId: params.tenantId,
    memberAccountId: params.accountId,
  });

  return { invited, inviteStatus };
}
