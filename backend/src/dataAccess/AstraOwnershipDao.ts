import { astraQuery } from '@/lib/astraPgPool';

const DIFY_DATABASE = 'prod_dify';

export type AstraOwnershipLookup = {
  tenantId: string;
  found: boolean;
  message: string;
  clientName: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  ownerAccountId: string | null;
  members: Array<{
    accountId: string;
    email: string;
    name: string | null;
    role: string;
  }>;
};

export type AstraAccountByEmail = {
  accountId: string;
  email: string;
  name: string | null;
  roleInTenant: string | null;
};

export async function lookupAstraOwnership(
  tenantId: string,
): Promise<AstraOwnershipLookup> {
  const id = tenantId.trim();
  if (!id) throw new Error('tenantId is required');

  const [tenantRows, memberRows] = await Promise.all([
    astraQuery<{ id: string; name: string | null }>(
      DIFY_DATABASE,
      `SELECT id, name FROM tenants WHERE id = $1 LIMIT 1`,
      [id],
    ),
    astraQuery<{
      account_id: string;
      email: string;
      name: string | null;
      role: string;
    }>(
      DIFY_DATABASE,
      `
        SELECT
          a.id AS account_id,
          a.email,
          a.name,
          taj.role
        FROM tenant_account_joins taj
        JOIN accounts a ON a.id = taj.account_id
        WHERE taj.tenant_id = $1
        ORDER BY
          CASE taj.role
            WHEN 'owner' THEN 0
            WHEN 'admin' THEN 1
            ELSE 2
          END,
          a.email ASC
      `,
      [id],
    ),
  ]);

  const tenant = tenantRows[0];
  const owner = memberRows.find((m) => m.role === 'owner') ?? null;

  if (!tenant && memberRows.length === 0) {
    return {
      tenantId: id,
      found: false,
      message: 'No Astra tenant found for this tenant ID.',
      clientName: null,
      ownerEmail: null,
      ownerName: null,
      ownerAccountId: null,
      members: [],
    };
  }

  return {
    tenantId: id,
    found: true,
    message: 'Tenant ownership loaded.',
    clientName: tenant?.name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.name ?? null,
    ownerAccountId: owner?.account_id ?? null,
    members: memberRows.map((m) => ({
      accountId: m.account_id,
      email: m.email,
      name: m.name,
      role: m.role,
    })),
  };
}

export async function findAstraAccountByEmail(
  email: string,
  tenantId?: string,
): Promise<AstraAccountByEmail | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const rows = await astraQuery<{
    account_id: string;
    email: string;
    name: string | null;
    role_in_tenant: string | null;
  }>(
    DIFY_DATABASE,
    `
      SELECT
        a.id AS account_id,
        a.email,
        a.name,
        taj.role AS role_in_tenant
      FROM accounts a
      LEFT JOIN tenant_account_joins taj
        ON taj.account_id = a.id
        AND taj.tenant_id = $2
      WHERE LOWER(a.email) = $1
      LIMIT 1
    `,
    [normalized, tenantId?.trim() || null],
  );

  const row = rows[0];
  if (!row) return null;
  return {
    accountId: row.account_id,
    email: row.email,
    name: row.name,
    roleInTenant: row.role_in_tenant,
  };
}
