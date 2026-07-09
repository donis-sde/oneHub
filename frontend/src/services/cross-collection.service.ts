import { apiGet, apiPost } from "@/lib/api-client"
import type { BulkUpdateBody, UpdateCollectionsResponse } from "@/types/api"

export const crossCollectionService = {
  getData: (params?: Record<string, string | number | undefined>) =>
    apiGet<{
      tenantData: Record<string, unknown>[]
      tenantCount: number
      settingsData: Record<string, unknown>[]
      settingsCount: number
    }>("/api/crossCollection/crossCollectionData", params),

  update: (body: BulkUpdateBody) =>
    apiPost<UpdateCollectionsResponse>("/api/crossCollection/crossCollectionUpdate", body),
}
