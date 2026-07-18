import { astraQuery } from '@/lib/astraPgPool';
import {
  astraPlanLabel,
  astraScheduleLabel,
  astraStatusLabel,
} from '@/lib/astraSubscriptionMaps';

const ACCOUNT_DATABASE = 'prod-astra-account-service';
const DIFY_DATABASE = 'prod_dify';

export type AstraAccountDetails = {
  tenantId: string;
  found: boolean;
  message: string;
  databases: {
    dify: string;
    account: string;
  };
  clientName: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
  currentBillingPlan: string | null;
  billingRenewDate: string | null;
  billingRenewDateHkt: string | null;
  planPrice: string | null;
  planPriceMinor: number | null;
  currency: string | null;
  billingSchedule: string | null;
  subscriptionStatus: string | null;
  subscriptionUuid: string | null;
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

function formatPlanPrice(
  amountMinor: unknown,
  currency: string | null,
): { display: string | null; minor: number | null } {
  if (amountMinor == null || amountMinor === '') {
    return { display: null, minor: null };
  }
  const minor = Number(amountMinor);
  if (!Number.isFinite(minor)) {
    return { display: null, minor: null };
  }
  const major = minor / 100;
  const code = (currency ?? '').trim().toUpperCase() || 'USD';
  try {
    return {
      minor,
      display: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
      }).format(major),
    };
  } catch {
    return {
      minor,
      display: `${major.toFixed(2)} ${code}`,
    };
  }
}

export async function getAstraAccountDetails(
  tenantId: string,
): Promise<AstraAccountDetails> {
  const id = tenantId.trim();
  if (!id) {
    throw new Error('tenantId is required');
  }

  const [tenantRows, ownerRows, subscriptionRows] = await Promise.all([
    astraQuery<{ id: string; name: string | null }>(
      DIFY_DATABASE,
      `
        SELECT id, name
        FROM tenants
        WHERE id = $1
        LIMIT 1
      `,
      [id],
    ),
    astraQuery<{
      email: string | null;
      account_name: string | null;
      role: string | null;
    }>(
      DIFY_DATABASE,
      `
        SELECT
          a.email,
          a.name AS account_name,
          taj.role
        FROM tenant_account_joins taj
        JOIN accounts a ON a.id = taj.account_id
        WHERE taj.tenant_id = $1
          AND taj.role = 'owner'
        ORDER BY taj.created_at ASC NULLS LAST
        LIMIT 1
      `,
      [id],
    ),
    astraQuery<{
      uuid: string;
      plan: number;
      status: number;
      schedule: number | null;
      current_period_end: unknown;
      amount_total: unknown;
      amount_net: unknown;
      currency: string | null;
    }>(
      ACCOUNT_DATABASE,
      `
        SELECT
          uuid,
          plan,
          status,
          schedule,
          current_period_end,
          amount_total,
          amount_net,
          currency
        FROM subscriptions
        WHERE tenant_uuid = $1
        ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [id],
    ),
  ]);

  const tenant = tenantRows[0];
  const owner = ownerRows[0];
  const sub = subscriptionRows[0];

  if (!tenant && !sub && !owner) {
    return {
      tenantId: id,
      found: false,
      message: 'No Astra account details found for this tenant ID.',
      databases: { dify: DIFY_DATABASE, account: ACCOUNT_DATABASE },
      clientName: null,
      ownerEmail: null,
      ownerName: null,
      currentBillingPlan: null,
      billingRenewDate: null,
      billingRenewDateHkt: null,
      planPrice: null,
      planPriceMinor: null,
      currency: null,
      billingSchedule: null,
      subscriptionStatus: null,
      subscriptionUuid: null,
    };
  }

  // Prefer net amount, fall back to total
  const priceSource =
    sub?.amount_net != null ? sub.amount_net : sub?.amount_total;
  const price = formatPlanPrice(priceSource, sub?.currency ?? null);

  return {
    tenantId: id,
    found: true,
    message: 'Account details loaded from Astra databases.',
    databases: { dify: DIFY_DATABASE, account: ACCOUNT_DATABASE },
    clientName: tenant?.name ?? owner?.account_name ?? null,
    ownerEmail: owner?.email ?? null,
    ownerName: owner?.account_name ?? null,
    currentBillingPlan: sub ? astraPlanLabel(Number(sub.plan)) : null,
    billingRenewDate: sub ? toIso(sub.current_period_end) : null,
    billingRenewDateHkt: sub ? toHkt(sub.current_period_end) : null,
    planPrice: price.display,
    planPriceMinor: price.minor,
    currency: sub?.currency ?? null,
    billingSchedule:
      sub?.schedule != null ? astraScheduleLabel(Number(sub.schedule)) : null,
    subscriptionStatus: sub ? astraStatusLabel(Number(sub.status)) : null,
    subscriptionUuid: sub?.uuid ?? null,
  };
}
