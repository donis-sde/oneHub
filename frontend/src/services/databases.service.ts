import { apiGet, apiPost } from "@/lib/api-client"
import type {
  BulkUpdateBody,
  Paginated,
  UpdateCollectionsResponse,
} from "@/types/api"

export const databasesService = {
  list: <T = Record<string, unknown>>(
    database: string,
    collection: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) =>
    apiGet<Paginated<T>>(
      `/api/databases/${database}/collections/${collection}`,
      params,
    ),

  getById: <T = Record<string, unknown>>(
    database: string,
    collection: string,
    id: string,
    params?: Record<string, string | number | boolean | undefined>,
  ) =>
    apiGet<Paginated<T>>(
      `/api/databases/${database}/collections/${collection}/${id}`,
      params,
    ),

  bulkUpdate: (
    database: string,
    collection: string,
    body: BulkUpdateBody,
  ) =>
    apiPost<UpdateCollectionsResponse>(
      `/api/databases/${database}/collections/${collection}`,
      body,
    ),
}
