export interface ApiErrorBody {
  error?: string
  err?: string
  message?: string
  success?: boolean
}

export interface Paginator {
  skip: number
  limit: number
}

export interface Paginated<T> {
  data: T[]
  paginator: Paginator
  hasNext?: boolean
  count: number
}

export interface FilterCriteria {
  field: string
  operator: string
  value: string
}

export interface BulkUpdateBody {
  filters: FilterCriteria[]
  editParams: {
    field: string
    newValue: string
    type: string
  }
}

export interface UpdateCollectionsResponse {
  matchedCount: number
  updatedCount: number
}

export interface LogsResponse<T = Record<string, unknown>> {
  logs: T[]
  total: number
}
