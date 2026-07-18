import { astraQuery } from '@/lib/astraPgPool';
import {
  ASTRA_TRIAL_PLANS,
  astraPlanLabel,
  astraStatusLabel,
} from '@/lib/astraSubscriptionMaps';

const ACCOUNT_DATABASE = 'prod-astra-account-service';

export type AstraTrialLookup = {
  tenantId: string;
  database: string;
  found: boolean;
  isTrial: boolean;
  trialExtendable: boolean;
  message: string;
  subscription: null | {
    id: string;
    uuid: string;
    plan: number;
    planLabel: string;
    status: number;
    statusLabel: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    /** Alias for trial end / current period end */
    trialEndAt: string | null;
    trialEndAtHkt: string | null;
    cancelAt: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    platform: number | null;
  };
  history: Array<{
    uuid: string;
    plan: number;
    planLabel: string;
    status: number;
    statusLabel: string;
    currentPeriodEnd: string | null;
    updatedAt: string | null;
  }>;
};

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

function toHkt(value: unknown): string | null {
  const iso = toIso(value);
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Hong_Kong',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}



export async function lookupAstraTrial(
  tenantId: string,
): Promise<AstraTrialLookup> {
  const id = tenantId.trim();
  if (!id) {
    throw new Error('tenantId is required');
  }

  const rows = await astraQuery<{
    id: unknown;
    uuid: string;
    tenant_uuid: string;
    plan: number;
    status: number;
    current_period_start: unknown;
    current_period_end: unknown;
    cancel_at: unknown;
    created_at: unknown;
    updated_at: unknown;
    platform: number | null;
  }>(
    ACCOUNT_DATABASE,
    `
      SELECT
        id,
        uuid,
        tenant_uuid,
        plan,
        status,
        current_period_start,
        current_period_end,
        cancel_at,
        created_at,
        updated_at,
        platform
      FROM subscriptions
      WHERE tenant_uuid = $1
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
      LIMIT 10
    `,
    [id],
  );

  if (rows.length === 0) {
    return {
      tenantId: id,
      database: ACCOUNT_DATABASE,
      found: false,
      isTrial: false,
      trialExtendable: false,
      message: 'No subscription found for this tenant.',
      subscription: null,
      history: [],
    };
  }

  const latest = rows[0];
  const plan = Number(latest.plan);
  const status = Number(latest.status);
  const isTrial = ASTRA_TRIAL_PLANS.has(plan);
  const planName = astraPlanLabel(plan);
  const statusName = astraStatusLabel(status);
  const trialEndAt = toIso(latest.current_period_end);

  let message: string;
  let trialExtendable = false;

  if (isTrial && status === 20) {
    trialExtendable = true;
    message = `Active trial (${planName}). Current trial end: ${trialEndAt ?? 'unknown'}.`;
  } else if (isTrial) {
    message = `Trial plan (${planName}) with status ${statusName}. Current period end: ${trialEndAt ?? 'unknown'}.`;
  } else if (plan === 20 || plan === 30 || plan >= 100) {
    message = `This tenant has a paid/bundle subscription (${planName}). Trial extension is not applicable.`;
  } else if (plan === 10) {
    message = 'This tenant is on the Free plan (not a trial). Trial extension is not applicable.';
  } else {
    message = `Subscription found (${planName} / ${statusName}). Period end: ${trialEndAt ?? 'unknown'}.`;
  }

  return {
    tenantId: id,
    database: ACCOUNT_DATABASE,
    found: true,
    isTrial,
    trialExtendable,
    message,
    subscription: {
      id: String(latest.id),
      uuid: latest.uuid,
      plan,
      planLabel: planName,
      status,
      statusLabel: statusName,
      currentPeriodStart: toIso(latest.current_period_start),
      currentPeriodEnd: trialEndAt,
      trialEndAt,
      trialEndAtHkt: toHkt(latest.current_period_end),
      cancelAt: toIso(latest.cancel_at),
      createdAt: toIso(latest.created_at),
      updatedAt: toIso(latest.updated_at),
      platform: latest.platform,
    },
    history: rows.map((row) => ({
      uuid: row.uuid,
      plan: Number(row.plan),
      planLabel: astraPlanLabel(Number(row.plan)),
      status: Number(row.status),
      statusLabel: astraStatusLabel(Number(row.status)),
      currentPeriodEnd: toIso(row.current_period_end),
      updatedAt: toIso(row.updated_at),
    })),
  };
}
