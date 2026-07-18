import { ASTRA_USAGE_DATABASE, astraQuery } from '@/lib/astraPgPool';

const METRICS_DATABASE = 'prod-astra-metrics';
const API_DATABASE = 'prod-astra-api-service';
const MAX_RANGE_DAYS = 93;

export type DailyAiUsageRow = {
  date: string;
  tenantId: string;
  agentId: string;
  agentWebsite: string | null;
  textConversations: number;
  textTurns: number;
  textCredits: number;
  voiceConversations: number;
  voiceTurns: number;
  voiceCredits: number;
  voiceDurationSec: number;
  actionEvents: number;
  actionCredits: number;
  totalCredits: number;
};

export type DailyAiUsageReport = {
  fromDate: string;
  toDate: string;
  /** @deprecated use fromDate/toDate */
  date: string;
  timezone: 'UTC';
  generatedAt: string;
  tenantId: string;
  databases: {
    metrics: string;
    usage: string;
    api: string;
  };
  summary: {
    dayCount: number;
    agentCount: number;
    tenantCount: number;
    textConversations: number;
    textTurns: number;
    textCredits: number;
    voiceConversations: number;
    voiceTurns: number;
    voiceCredits: number;
    voiceDurationSec: number;
    actionEvents: number;
    actionCredits: number;
    totalCredits: number;
  };
  /** Day-wise agent rows (one row per date + agent) */
  rows: DailyAiUsageRow[];
};

function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  return Number(value) || 0;
}

function assertDate(date: string, label = 'date'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${label} must be YYYY-MM-DD`);
  }
  return date;
}

function eachUtcDateInclusive(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${fromDate}T00:00:00.000Z`);
  const end = new Date(`${toDate}T00:00:00.000Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function assertRange(fromDate: string, toDate: string): {
  fromDate: string;
  toDate: string;
} {
  const from = assertDate(fromDate, 'fromDate');
  const to = assertDate(toDate, 'toDate');
  if (from > to) {
    throw new Error('fromDate must be on or before toDate');
  }
  const days = eachUtcDateInclusive(from, to).length;
  if (days > MAX_RANGE_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_RANGE_DAYS} days`);
  }
  return { fromDate: from, toDate: to };
}

type HourlyRow = {
  usage_date: string;
  tenant_id: string;
  agent_id: string;
  text_conversations: unknown;
  text_turns: unknown;
  voice_conversations: unknown;
  voice_turns: unknown;
  voice_duration_sec: unknown;
};

type CreditAgentRow = {
  usage_date: string;
  tenant_id: string;
  agent_id: string;
  voice_credits: unknown;
  voice_events: unknown;
  voice_duration_sec: unknown;
  action_credits: unknown;
  action_events: unknown;
};

type TextTenantRow = {
  usage_date: string;
  tenant_id: string;
  text_credits: unknown;
};

type TrackerRow = {
  agent_id: string;
  website_url: string | null;
};

async function queryMetricsDatabase<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return astraQuery<T>(METRICS_DATABASE, text, params);
}

async function queryApiDatabase<T extends Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  return astraQuery<T>(API_DATABASE, text, params);
}

function toDateString(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const raw = String(value);
  return raw.slice(0, 10);
}

export async function getDailyAiUsageReport(options: {
  fromDate: string;
  toDate: string;
  tenantId: string;
}): Promise<DailyAiUsageReport> {
  const { fromDate, toDate } = assertRange(options.fromDate, options.toDate);
  const tenantId = options.tenantId.trim();
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  // $1 fromDate, $2 toDate (exclusive end = toDate + 1 day), $3 tenantId
  const rangeParams: unknown[] = [fromDate, toDate, tenantId];

  const [hourlyRows, creditRows, textTenantRows, trackerRows] =
    await Promise.all([
      queryMetricsDatabase<HourlyRow>(
        `
        SELECT
          (date_hour AT TIME ZONE 'UTC')::date::text AS usage_date,
          tenant_id,
          agent_id,
          SUM(
            CASE
              WHEN channel = 'text'
                THEN COALESCE((metrics_json->>'total_conversations')::numeric, 0)
              ELSE 0
            END
          )::bigint AS text_conversations,
          SUM(
            CASE
              WHEN channel = 'text'
                THEN COALESCE((metrics_json->>'total_turns')::numeric, 0)
              ELSE 0
            END
          )::bigint AS text_turns,
          SUM(
            CASE
              WHEN channel = 'voice'
                THEN COALESCE((metrics_json->>'total_conversations')::numeric, 0)
              ELSE 0
            END
          )::bigint AS voice_conversations,
          SUM(
            CASE
              WHEN channel = 'voice'
                THEN COALESCE((metrics_json->>'total_turns')::numeric, 0)
              ELSE 0
            END
          )::bigint AS voice_turns,
          SUM(
            CASE
              WHEN channel = 'voice'
                THEN COALESCE((metrics_json->>'total_duration')::numeric, 0)
              ELSE 0
            END
          )::bigint AS voice_duration_sec
        FROM agent_hourly_metrics
        WHERE date_hour >= $1::timestamptz
          AND date_hour < ($2::date + 1)::timestamptz
          AND tenant_id = $3
          AND COALESCE(agent_id, '') <> ''
        GROUP BY (date_hour AT TIME ZONE 'UTC')::date, tenant_id, agent_id
        `,
        rangeParams,
      ),
      astraQuery<CreditAgentRow>(
        ASTRA_USAGE_DATABASE,
        `
        SELECT
          created_at::date::text AS usage_date,
          tenant_id,
          COALESCE(record::jsonb->>'agent_id', '') AS agent_id,
          COALESCE(SUM(number) FILTER (WHERE reason = 'voice_message'), 0)::bigint AS voice_credits,
          COALESCE(COUNT(*) FILTER (WHERE reason = 'voice_message'), 0)::bigint AS voice_events,
          COALESCE(
            SUM(COALESCE((record::jsonb->>'duration')::numeric, 0))
              FILTER (WHERE reason = 'voice_message'),
            0
          )::bigint AS voice_duration_sec,
          COALESCE(SUM(number) FILTER (WHERE reason = 'action_event'), 0)::bigint AS action_credits,
          COALESCE(COUNT(*) FILTER (WHERE reason = 'action_event'), 0)::bigint AS action_events
        FROM credit_usages
        WHERE created_at >= $1::timestamp
          AND created_at < ($2::date + 1)::timestamp
          AND tenant_id = $3
          AND reason IN ('voice_message', 'action_event')
          AND record LIKE '{%'
        GROUP BY created_at::date, tenant_id, COALESCE(record::jsonb->>'agent_id', '')
        HAVING COALESCE(record::jsonb->>'agent_id', '') <> ''
        `,
        rangeParams,
      ),
      astraQuery<TextTenantRow>(
        ASTRA_USAGE_DATABASE,
        `
        SELECT
          created_at::date::text AS usage_date,
          tenant_id,
          COALESCE(SUM(number), 0)::bigint AS text_credits
        FROM credit_usages
        WHERE created_at >= $1::timestamp
          AND created_at < ($2::date + 1)::timestamp
          AND tenant_id = $3
          AND reason = 'agent_message'
        GROUP BY created_at::date, tenant_id
        `,
        rangeParams,
      ),
      queryApiDatabase<TrackerRow>(
        `
        SELECT DISTINCT ON (agent_id)
          agent_id,
          NULLIF(website_url, '') AS website_url
        FROM agent_trackers
        WHERE tenant_id = $1
          AND COALESCE(agent_id, '') <> ''
        ORDER BY agent_id, created_at DESC
        `,
        [tenantId],
      ).catch(() => [] as TrackerRow[]),
    ]);

  const websiteByAgent = new Map(
    trackerRows.map((row) => [row.agent_id, row.website_url]),
  );

  type AccRow = {
    date: string;
    tenantId: string;
    agentId: string;
    textConversations: number;
    textTurns: number;
    voiceConversations: number;
    voiceTurns: number;
    voiceDurationSec: number;
    voiceCredits: number;
    actionEvents: number;
    actionCredits: number;
  };

  const byKey = new Map<string, AccRow>();

  const ensure = (date: string, tenant: string, agent: string) => {
    const key = `${date}::${tenant}::${agent}`;
    let row = byKey.get(key);
    if (!row) {
      row = {
        date,
        tenantId: tenant,
        agentId: agent,
        textConversations: 0,
        textTurns: 0,
        voiceConversations: 0,
        voiceTurns: 0,
        voiceDurationSec: 0,
        voiceCredits: 0,
        actionEvents: 0,
        actionCredits: 0,
      };
      byKey.set(key, row);
    }
    return row;
  };

  for (const row of hourlyRows) {
    const usageDate = toDateString(row.usage_date);
    const target = ensure(usageDate, row.tenant_id, row.agent_id);
    target.textConversations = toNumber(row.text_conversations);
    target.textTurns = toNumber(row.text_turns);
    target.voiceConversations = toNumber(row.voice_conversations);
    target.voiceTurns = toNumber(row.voice_turns);
    target.voiceDurationSec = Math.max(
      target.voiceDurationSec,
      toNumber(row.voice_duration_sec),
    );
  }

  for (const row of creditRows) {
    const usageDate = toDateString(row.usage_date);
    const target = ensure(usageDate, row.tenant_id, row.agent_id);
    target.voiceCredits = toNumber(row.voice_credits);
    target.actionEvents = toNumber(row.action_events);
    target.actionCredits = toNumber(row.action_credits);
    target.voiceDurationSec = Math.max(
      target.voiceDurationSec,
      toNumber(row.voice_duration_sec),
    );
  }

  // tenant+day text turns for credit allocation
  const tenantDayTextTurns = new Map<string, number>();
  for (const row of byKey.values()) {
    const key = `${row.date}::${row.tenantId}`;
    tenantDayTextTurns.set(
      key,
      (tenantDayTextTurns.get(key) ?? 0) + row.textTurns,
    );
  }

  const textCreditsByTenantDay = new Map(
    textTenantRows.map((row) => [
      `${toDateString(row.usage_date)}::${row.tenant_id}`,
      toNumber(row.text_credits),
    ]),
  );

  const rows: DailyAiUsageRow[] = [...byKey.values()]
    .map((row) => {
      const dayKey = `${row.date}::${row.tenantId}`;
      const tenantCredits = textCreditsByTenantDay.get(dayKey) ?? 0;
      const tenantTurns = tenantDayTextTurns.get(dayKey) ?? 0;
      const textCredits =
        tenantCredits > 0 && tenantTurns > 0
          ? Math.round((tenantCredits * row.textTurns) / tenantTurns)
          : 0;

      return {
        date: row.date,
        tenantId: row.tenantId,
        agentId: row.agentId,
        agentWebsite: websiteByAgent.get(row.agentId) ?? null,
        textConversations: row.textConversations,
        textTurns: row.textTurns,
        textCredits,
        voiceConversations: row.voiceConversations,
        voiceTurns: row.voiceTurns,
        voiceCredits: row.voiceCredits,
        voiceDurationSec: row.voiceDurationSec,
        actionEvents: row.actionEvents,
        actionCredits: row.actionCredits,
        totalCredits: textCredits + row.voiceCredits + row.actionCredits,
      };
    })
    .filter(
      (row) =>
        row.textConversations > 0 ||
        row.textTurns > 0 ||
        row.textCredits > 0 ||
        row.voiceConversations > 0 ||
        row.voiceTurns > 0 ||
        row.voiceCredits > 0 ||
        row.actionEvents > 0 ||
        row.actionCredits > 0,
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      if (b.totalCredits !== a.totalCredits) {
        return b.totalCredits - a.totalCredits;
      }
      return b.textTurns - a.textTurns;
    });

  const summary = rows.reduce(
    (acc, row) => {
      acc.textConversations += row.textConversations;
      acc.textTurns += row.textTurns;
      acc.textCredits += row.textCredits;
      acc.voiceConversations += row.voiceConversations;
      acc.voiceTurns += row.voiceTurns;
      acc.voiceCredits += row.voiceCredits;
      acc.voiceDurationSec += row.voiceDurationSec;
      acc.actionEvents += row.actionEvents;
      acc.actionCredits += row.actionCredits;
      acc.totalCredits += row.totalCredits;
      return acc;
    },
    {
      dayCount: new Set(rows.map((r) => r.date)).size,
      agentCount: new Set(rows.map((r) => r.agentId)).size,
      tenantCount: new Set(rows.map((r) => r.tenantId)).size,
      textConversations: 0,
      textTurns: 0,
      textCredits: 0,
      voiceConversations: 0,
      voiceTurns: 0,
      voiceCredits: 0,
      voiceDurationSec: 0,
      actionEvents: 0,
      actionCredits: 0,
      totalCredits: 0,
    },
  );

  summary.textCredits = [...textCreditsByTenantDay.values()].reduce(
    (sum, value) => sum + value,
    0,
  );
  summary.totalCredits =
    summary.textCredits + summary.voiceCredits + summary.actionCredits;

  return {
    fromDate,
    toDate,
    date: fromDate === toDate ? fromDate : `${fromDate}_to_${toDate}`,
    timezone: 'UTC',
    generatedAt: new Date().toISOString(),
    tenantId,
    databases: {
      metrics: METRICS_DATABASE,
      usage: ASTRA_USAGE_DATABASE,
      api: API_DATABASE,
    },
    summary,
    rows,
  };
}

export function dailyAiUsageReportToCsv(report: DailyAiUsageReport): string {
  const headers = [
    'date',
    'tenant_id',
    'agent_id',
    'agent_website',
    'text_conversations',
    'text_turns',
    'text_credits',
    'voice_conversations',
    'voice_turns',
    'voice_credits',
    'voice_duration_sec',
    'action_events',
    'action_credits',
    'total_credits',
  ];

  const escape = (value: string | number | null) => {
    const raw = value == null ? '' : String(value);
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [headers.join(',')];
  for (const row of report.rows) {
    lines.push(
      [
        row.date,
        row.tenantId,
        row.agentId,
        row.agentWebsite,
        row.textConversations,
        row.textTurns,
        row.textCredits,
        row.voiceConversations,
        row.voiceTurns,
        row.voiceCredits,
        row.voiceDurationSec,
        row.actionEvents,
        row.actionCredits,
        row.totalCredits,
      ]
        .map(escape)
        .join(','),
    );
  }

  return `${lines.join('\n')}\n`;
}
