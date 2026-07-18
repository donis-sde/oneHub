/** Account-service plan codes observed in prod */
export const ASTRA_PLAN_LABELS: Record<number, string> = {
  10: 'FREE',
  11: 'BYOA_USER_TRIAL',
  15: 'NEW_USER_TRIAL',
  20: 'PRO',
  30: 'BUSINESS',
  100: 'WATI_BUNDLE_GROWTH',
  101: 'WATI_BUNDLE_PRO',
  102: 'WATI_BUNDLE_BUSINESS',
  103: 'WATI_BUNDLE_ENTERPRISE',
};

/** Account-service status codes observed in prod */
export const ASTRA_STATUS_LABELS: Record<number, string> = {
  10: 'NO_SUBSCRIPTION',
  20: 'SUB_ACTIVE',
  30: 'SUB_DISABLE',
  40: 'SUB_EXPIRED',
};

export const ASTRA_TRIAL_PLANS = new Set([11, 15]);

export const ASTRA_SCHEDULE_LABELS: Record<number, string> = {
  10: 'MONTHLY',
  20: 'YEARLY',
};

export function astraPlanLabel(plan: number): string {
  return ASTRA_PLAN_LABELS[plan] ?? `UNKNOWN_PLAN_${plan}`;
}

export function astraStatusLabel(status: number): string {
  return ASTRA_STATUS_LABELS[status] ?? `UNKNOWN_STATUS_${status}`;
}

export function astraScheduleLabel(schedule: number): string {
  return ASTRA_SCHEDULE_LABELS[schedule] ?? `UNKNOWN_SCHEDULE_${schedule}`;
}
