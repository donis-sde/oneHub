import { ASTRA_USAGE_DATABASE, astraQuery } from '@/lib/astraPgPool';

export type AstraCreditGrant = {
  id: string;
  balance: number;
  totalAmount: number;
  sourceType: string;
  sourceId: string | null;
  startAt: string | null;
  expiredAt: string | null;
  isActive: boolean;
};

export type AstraUsageByReason = {
  reason: string;
  credits: number;
  events: number;
};

export type AstraRecentUsage = {
  id: string;
  number: number;
  reason: string;
  record: string | null;
  createdAt: string | null;
};

export type AstraAiUsageSummary = {
  tenantId: string;
  database: string;
  summary: {
    availableBalance: number;
    totalGranted: number;
    grantCount: number;
    activeGrantCount: number;
    totalCreditsLogged: number;
    totalUsageEvents: number;
    firstUsageAt: string | null;
    lastUsageAt: string | null;
    last30DaysCredits: number;
    last30DaysEvents: number;
    agentUsageEvents: number;
    datasetUsageEvents: number;
  };
  usageByReason: AstraUsageByReason[];
  activeGrants: AstraCreditGrant[];
  recentUsages: AstraRecentUsage[];
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return Number(value);
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export async function getAiUsageForTenant(
  tenantId: string,
): Promise<AstraAiUsageSummary> {
  const database = ASTRA_USAGE_DATABASE;

  const [summaryRows, reasonRows, grantRows, recentRows, agentRows, datasetRows] =
    await Promise.all([
      astraQuery<{
        available_balance: unknown;
        total_granted: unknown;
        grant_count: unknown;
        active_grant_count: unknown;
        total_credits_logged: unknown;
        total_usage_events: unknown;
        first_usage_at: unknown;
        last_usage_at: unknown;
        last_30d_credits: unknown;
        last_30d_events: unknown;
      }>(
        database,
        `
        SELECT
          COALESCE((
            SELECT SUM(balance)
            FROM credit_grants
            WHERE tenant_id = $1
              AND (expired_at IS NULL OR expired_at > NOW())
          ), 0) AS available_balance,
          COALESCE((
            SELECT SUM(total_amount)
            FROM credit_grants
            WHERE tenant_id = $1
          ), 0) AS total_granted,
          COALESCE((
            SELECT COUNT(*)
            FROM credit_grants
            WHERE tenant_id = $1
          ), 0) AS grant_count,
          COALESCE((
            SELECT COUNT(*)
            FROM credit_grants
            WHERE tenant_id = $1
              AND (expired_at IS NULL OR expired_at > NOW())
          ), 0) AS active_grant_count,
          COALESCE((
            SELECT SUM(number)
            FROM credit_usages
            WHERE tenant_id = $1
          ), 0) AS total_credits_logged,
          COALESCE((
            SELECT COUNT(*)
            FROM credit_usages
            WHERE tenant_id = $1
          ), 0) AS total_usage_events,
          (
            SELECT MIN(created_at)
            FROM credit_usages
            WHERE tenant_id = $1
          ) AS first_usage_at,
          (
            SELECT MAX(created_at)
            FROM credit_usages
            WHERE tenant_id = $1
          ) AS last_usage_at,
          COALESCE((
            SELECT SUM(number)
            FROM credit_usages
            WHERE tenant_id = $1
              AND created_at >= NOW() - INTERVAL '30 days'
          ), 0) AS last_30d_credits,
          COALESCE((
            SELECT COUNT(*)
            FROM credit_usages
            WHERE tenant_id = $1
              AND created_at >= NOW() - INTERVAL '30 days'
          ), 0) AS last_30d_events
        `,
        [tenantId],
      ),
      astraQuery<{
        reason: string;
        credits: unknown;
        events: unknown;
      }>(
        database,
        `
        SELECT
          COALESCE(reason, 'unknown') AS reason,
          SUM(number)::bigint AS credits,
          COUNT(*)::bigint AS events
        FROM credit_usages
        WHERE tenant_id = $1
        GROUP BY COALESCE(reason, 'unknown')
        ORDER BY credits DESC
        `,
        [tenantId],
      ),
      astraQuery<{
        id: unknown;
        balance: unknown;
        total_amount: unknown;
        source_type: string;
        source_id: string | null;
        start_at: unknown;
        expired_at: unknown;
        is_active: boolean;
      }>(
        database,
        `
        SELECT
          id,
          balance,
          total_amount,
          source_type,
          source_id,
          start_at,
          expired_at,
          (expired_at IS NULL OR expired_at > NOW()) AS is_active
        FROM credit_grants
        WHERE tenant_id = $1
          AND (expired_at IS NULL OR expired_at > NOW())
        ORDER BY expired_at ASC NULLS LAST, created_at DESC
        LIMIT 25
        `,
        [tenantId],
      ),
      astraQuery<{
        id: unknown;
        number: unknown;
        reason: string;
        record: string | null;
        created_at: unknown;
      }>(
        database,
        `
        SELECT id, number, reason, record, created_at
        FROM credit_usages
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [tenantId],
      ),
      astraQuery<{ count: unknown }>(
        database,
        `
        SELECT COUNT(*)::bigint AS count
        FROM agent_usages
        WHERE tenant_id = $1
        `,
        [tenantId],
      ),
      astraQuery<{ count: unknown }>(
        database,
        `
        SELECT COUNT(*)::bigint AS count
        FROM dataset_usages
        WHERE tenant_id = $1
        `,
        [tenantId],
      ),
    ]);

  const summary = summaryRows[0];

  return {
    tenantId,
    database,
    summary: {
      availableBalance: toNumber(summary?.available_balance),
      totalGranted: toNumber(summary?.total_granted),
      grantCount: toNumber(summary?.grant_count),
      activeGrantCount: toNumber(summary?.active_grant_count),
      totalCreditsLogged: toNumber(summary?.total_credits_logged),
      totalUsageEvents: toNumber(summary?.total_usage_events),
      firstUsageAt: toIso(summary?.first_usage_at),
      lastUsageAt: toIso(summary?.last_usage_at),
      last30DaysCredits: toNumber(summary?.last_30d_credits),
      last30DaysEvents: toNumber(summary?.last_30d_events),
      agentUsageEvents: toNumber(agentRows[0]?.count),
      datasetUsageEvents: toNumber(datasetRows[0]?.count),
    },
    usageByReason: reasonRows.map((row) => ({
      reason: row.reason,
      credits: toNumber(row.credits),
      events: toNumber(row.events),
    })),
    activeGrants: grantRows.map((row) => ({
      id: String(row.id),
      balance: toNumber(row.balance),
      totalAmount: toNumber(row.total_amount),
      sourceType: row.source_type,
      sourceId: row.source_id,
      startAt: toIso(row.start_at),
      expiredAt: toIso(row.expired_at),
      isActive: Boolean(row.is_active),
    })),
    recentUsages: recentRows.map((row) => ({
      id: String(row.id),
      number: toNumber(row.number),
      reason: row.reason,
      record: row.record,
      createdAt: toIso(row.created_at),
    })),
  };
}
