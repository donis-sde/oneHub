import { apiGet } from "@/lib/api-client"

export type AstraAiUsageResponse = {
  tenantId: string
  database: string
  summary: {
    availableBalance: number
    totalGranted: number
    grantCount: number
    activeGrantCount: number
    totalCreditsLogged: number
    totalUsageEvents: number
    firstUsageAt: string | null
    lastUsageAt: string | null
    last30DaysCredits: number
    last30DaysEvents: number
    agentUsageEvents: number
    datasetUsageEvents: number
  }
  usageByReason: Array<{
    reason: string
    credits: number
    events: number
  }>
  activeGrants: Array<{
    id: string
    balance: number
    totalAmount: number
    sourceType: string
    sourceId: string | null
    startAt: string | null
    expiredAt: string | null
    isActive: boolean
  }>
  recentUsages: Array<{
    id: string
    number: number
    reason: string
    record: string | null
    createdAt: string | null
  }>
}

export type AstraDatabaseStatusResponse = {
  host: string | null
  user: string | null
  port: number
  readOnly: true
  databases: Array<{
    database: string
    ok: boolean
    error?: string
    latencyMs?: number
  }>
}

export type AstraTablesResponse = {
  database: string
  tables: Array<{
    table_schema: string
    table_name: string
    table_type: string
  }>
}

export type AstraColumnsResponse = {
  database: string
  table: string
  columns: Array<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>
}

export type AstraDailyAiUsageRow = {
  date: string
  tenantId: string
  agentId: string
  agentWebsite: string | null
  textConversations: number
  textTurns: number
  textCredits: number
  voiceConversations: number
  voiceTurns: number
  voiceCredits: number
  voiceDurationSec: number
  actionEvents: number
  actionCredits: number
  totalCredits: number
}

export type AstraDailyAiUsageReport = {
  fromDate: string
  toDate: string
  date: string
  timezone: "UTC"
  generatedAt: string
  tenantId: string
  databases: {
    metrics: string
    usage: string
    api: string
  }
  summary: {
    dayCount: number
    agentCount: number
    tenantCount: number
    textConversations: number
    textTurns: number
    textCredits: number
    voiceConversations: number
    voiceTurns: number
    voiceCredits: number
    voiceDurationSec: number
    actionEvents: number
    actionCredits: number
    totalCredits: number
  }
  rows: AstraDailyAiUsageRow[]
}

export const astraService = {
  getAiUsage: (tenantId: string) =>
    apiGet<AstraAiUsageResponse>("/api/astra/aiUsage", { tenantId }),

  getDailyAiUsage: (params: {
    fromDate: string
    toDate: string
    tenantId: string
  }) => apiGet<AstraDailyAiUsageReport>("/api/astra/dailyAiUsage", params),

  listDatabases: () =>
    apiGet<AstraDatabaseStatusResponse>("/api/astra/databases"),

  listTables: (database: string) =>
    apiGet<AstraTablesResponse>("/api/astra/databases", { database }),

  listColumns: (database: string, table: string) =>
    apiGet<AstraColumnsResponse>("/api/astra/databases", { database, table }),
}
