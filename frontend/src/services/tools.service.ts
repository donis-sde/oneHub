import { apiGet, apiPost, apiPut } from "@/lib/api-client"
import type { LogsResponse } from "@/types/api"

const logEndpoints = {
  getPhoneNumLogs: "/api/backofficeLogs/getPhoneNumLogs",
  getBmidLogs: "/api/backofficeLogs/getBmidLogs",
  getOtpLogs: "/api/backofficeLogs/getOtpLogs",
  regPhoneNumLogs: "/api/backofficeLogs/regPhoneNumLogs",
  removeCreditLineLogs: "/api/backofficeLogs/removeCreditLineLogs",
  backofficeDbUpdateLogs: "/api/backofficeLogs/backofficeDbUpdateLogs",
  createUserLogs: "/api/backofficeLogs/createUserLogs",
  terminateSubscriptionLogs: "/api/backofficeLogs/terminateSubscriptionLogs",
  cleanCacheLogs: "/api/backofficeLogs/cleanCacheLogs",
  apiExplorerLogs: "/api/backofficeLogs/apiExplorerLogs",
  stopBroadcastLogs: "/api/backofficeLogs/stopBroadcastLogs",
  stopBroadcastRetriesLogs: "/api/backofficeLogs/stopBroadcastRetriesLogs",
} as const

export type BackofficeLogKey = keyof typeof logEndpoints

export const backofficeLogsService = {
  list: (key: BackofficeLogKey, params?: Record<string, string | number | undefined>) =>
    apiGet<LogsResponse>(logEndpoints[key], params),
}

export const watiCustomerStatusService = {
  queryTenant: (q: string) =>
    apiGet<{ result: Record<string, unknown> }>("/api/watiCustomerStatus/queryTenant", { q }),

  queryCreditCustomer: (q: string) =>
    apiGet<Record<string, unknown>>("/api/watiCustomerStatus/queryCreditCustomer", { q }),

  queryWatiStates: () =>
    apiGet<Record<string, unknown>>("/api/watiCustomerStatus/queryWatiStates"),
}

export const createExtAdminService = {
  create: (body: Record<string, unknown>) =>
    apiPost<{ profile: Record<string, unknown> }>("/api/createExtAdmin", body),

  validateTenantId: (tenantId: string) =>
    apiGet<Record<string, unknown>>("/api/createExtAdmin/validateTenantId", { tenantId }),

  validateTenantUserEmail: (params: Record<string, string>) =>
    apiGet<Record<string, unknown>>("/api/createExtAdmin/validateTenantUserEmail", params),
}

export const createExtAdminEuService = {
  create: (body: Record<string, unknown>) =>
    apiPost<{ profile: Record<string, unknown> }>("/api/createExtAdminForEU", body),

  validateTenantId: (tenantId: string) =>
    apiGet<Record<string, unknown>>("/api/createExtAdminForEU/validateTenantId", { tenantId }),

  validateTenantUserEmail: (params: Record<string, string>) =>
    apiGet<Record<string, unknown>>("/api/createExtAdminForEU/validateTenantUserEmail", params),
}

export const registerCloudApiService = {
  register: (body: { subId: string }) =>
    apiPost<{ result: Record<string, unknown> | null }>("/api/registerCloudAPI/register", body),

  retryRegister: () =>
    apiPost<{ result: boolean | null }>("/api/registerCloudAPI/retryRegister"),

  viewAuditLog: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/registerCloudAPI/viewAuditLog", params),
}

export const onboardingFixService = {
  fix: (body: { subscriptionId: string; cloudApiSetupProcessId: string }) =>
    apiPost<{ success: boolean; message: string; steps: Record<string, unknown>[] }>(
      "/api/onboardingFix",
      body,
    ),

  lookup: (params: Record<string, string>) =>
    apiGet<Record<string, unknown>>("/api/onboardingFix/lookup", params),
}

export const cleanCacheService = {
  clean: (body: { clientId: string }) =>
    apiPost<{ message: string }>("/api/cleanCache", body),
}

export const broadcastService = {
  getList: (tenantId: string, keyword: string) =>
    apiGet<{ data: Record<string, unknown> }>("/api/getBroadcastList", { tenantId, keyword }),

  stop: (body: { tenantId: string; broadcastId: string; slackUrl?: string }) =>
    apiPost<{ message: string }>("/api/stopBroadcast", body),

  stopRetries: (body: { tenantId: string; broadcastId: string; slackUrl?: string }) =>
    apiPost<{ message: string }>("/api/stopBroadcastRetries", body),
}

export const manageSubscriptionService = {
  validateTenantId: (tenantId: string) =>
    apiGet<Record<string, unknown>[]>("/api/manageSubscription/validateTenantId", { tenantId }),

  disableTenantFeature: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/manageSubscription/disableTenantFeature", body),

  terminateSubscriptionLogs: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/manageSubscription/terminateSubscriptionLogHandler", params),

  createTerminateLog: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/manageSubscription/terminateSubscriptionLogHandler", body),
}

export const mpsManagementService = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiGet<{
      result: { TenantId: string; RateLimit: number; UpdatedAt: string }[]
      total: number
      page: number
      limit: number
    }>("/api/mpsManagement/mps", params),

  update: (body: { tenant_id: string; rate_limit: number }) =>
    apiPut<{ result: string }>("/api/mpsManagement/updateMps", body),

  auditLogs: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/mpsManagement/auditlogs", params),
}

export const frtService = {
  report: (params: { startDate: string; endDate: string; tenantId: string }) =>
    apiGet<Record<string, unknown>>("/api/frt/frt", params),

  validateTenantId: (tenantId: string) =>
    apiGet<Record<string, unknown>>("/api/frt/validateTenantId", { tenantId }),
}

export type TeamInboxReportResponse = {
  filename: string
  contentType: string
  csv: string
  clientId: string
  timezone: string
  from: string
  to: string
}

export const teamInboxReportService = {
  export: (body: {
    clientId: string
    bearerToken: string
    fromDate: string
    toDate: string
    timezone: string
  }) => apiPost<TeamInboxReportResponse>("/api/teamInboxReport", body),
}

export const apiExplorerService = {
  execute: (body: { method: string; url: string; headers?: Record<string, string>; body?: string }) =>
    apiPost<{
      status: number
      statusText: string
      headers: Record<string, string>
      data: unknown
      responseTime: number
      size: number
    }>("/api/apiExplorer", body),
}

export const deleteContactsService = {
  verify: (tenantId: string) =>
    apiGet<Record<string, unknown>>("/api/deleteContacts/tenantContactsHandler", {
      operation: "verify",
      tenantId,
    }),

  count: (params: { tenantId: string; startDate?: string; endDate?: string }) =>
    apiGet<Record<string, unknown>>("/api/deleteContacts/tenantContactsHandler", params),

  logs: (tenantId: string, operationType: string) =>
    apiGet<Record<string, unknown>>("/api/deleteContacts/tenantContactsHandler", {
      operation: "logs",
      tenantId,
      operationType,
    }),

  delete: (
    body: { tenantId: string; startDate?: string; endDate?: string },
    action: "deleteAll" | "range",
  ) =>
    apiPost<Record<string, unknown>>(
      `/api/deleteContacts/tenantContactsHandler?operation=update&action=${action}`,
      body,
    ),

  activityLog: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(
      "/api/deleteContacts/tenantContactsHandler?operation=activitylog",
      body,
    ),
}

export const deleteHubspotService = {
  deleteMappings: (body: {
    region: "mt" | "eu"
    tenantId: string
    criteria: Record<string, string>[]
  }) =>
    apiPost<{ ok: boolean; deletedCount: number; message: string }>(
      "/api/deleteHubspotContactMappings",
      body,
    ),
}

export const partnershipService = {
  transactions: {
    list: (params?: Record<string, string | number | undefined>) =>
      apiGet<Record<string, unknown>>("/api/partnershipManagement/transactions", params),

    create: (body: Record<string, unknown>) =>
      apiPost<Record<string, unknown>>("/api/partnershipManagement/transactions", body),

    update: (body: Record<string, unknown>) =>
      apiPost<Record<string, unknown>>("/api/partnershipManagement/transactions", body),

    bulkUpdate: (body: Record<string, unknown>) =>
      apiPost<Record<string, unknown>>("/api/partnershipManagement/transactions", body),

    delete: (body: Record<string, unknown>) =>
      apiPost<Record<string, unknown>>("/api/partnershipManagement/transactions", {
        ...body,
        _method: "DELETE",
      }),
  },
}

export const affiliateDashboardService = {
  partners: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/affiliatePartnerDashboard/partners", params),

  customers: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/affiliatePartnerDashboard/customers", params),

  transactions: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/affiliatePartnerDashboard/transactions", params),

  groups: () =>
    apiGet<Record<string, unknown>[]>("/api/affiliatePartnerDashboard/groups"),

  updateGroupIsSubOnly: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>(
      "/api/affiliatePartnerDashboard/groups/updateIsSubOnly",
      body,
    ),
}

export const usageCalculatorService = {
  calculate: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/usageCalculator/calculate", body),

  referenceData: () =>
    apiGet<{ countryNames: string[] }>("/api/usageCalculator/referenceData"),

  cbFxRates: () =>
    apiGet<{ rows: { currency_code: string; exchange_rate: number }[] }>(
      "/api/usageCalculator/cbFxRates",
    ),

  getFxRate: () =>
    apiGet<{ inrToUsdRate: number; canUpdate: boolean }>("/api/usageCalculator/fxRate"),

  updateFxRate: (body: { inrToUsdRate: number }) =>
    apiPost<{ inrToUsdRate: number }>("/api/usageCalculator/fxRate", body),
}

export const retoolService = {
  tenants: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/retool/tenants", params),

  updateTenant: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/tenants", body),

  batchUpdateTenants: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/tenants/batch-update", body),

  settings: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/retool/settings", params),

  updateSettings: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/settings", body),

  batchUpdateSettings: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/settings/batch-update", body),

  creditCustomers: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/retool/billing/credit-customers", params),

  updateCreditCustomers: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/billing/credit-customers", body),

  creditEventLogs: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/retool/billing/credit-event-logs", params),

  updateCreditEventLogs: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/billing/credit-event-logs", body),

  cancelSubscriptionQuestionnaire: (params?: Record<string, string | number | undefined>) =>
    apiGet<Record<string, unknown>>("/api/retool/cancel-subscription-questionnaire", params),

  updateCancelSubscriptionQuestionnaire: (body: Record<string, unknown>) =>
    apiPost<Record<string, unknown>>("/api/retool/cancel-subscription-questionnaire", body),
}
