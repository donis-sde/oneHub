import { apiGet } from "@/lib/api-client"

export const healthService = {
  check: () => apiGet<Record<string, never>>("/api/healthCheck"),
  openApi: () => apiGet<Record<string, unknown>>("/api/openapi.json"),
}
