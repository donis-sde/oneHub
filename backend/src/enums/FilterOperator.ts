// https://www.mongodb.com/docs/manual/reference/operator/query/
export enum FilterOperator {
  EQ = 'eq',
  GT = 'gt',
  GTE = 'gte',
  LT = 'lt',
  LTE = 'lte',
  NE = 'ne',
  EXISTS = 'exists',
  LIKE = 'like',
  NOT_LIKE = 'not_like',
  START_WITH = 'start_with',
  END_WITH = 'end_with',
}

export const FilterNameMap: Record<FilterOperator, string> = {
  [FilterOperator.EQ]: 'equal',
  [FilterOperator.GT]: 'greater than',
  [FilterOperator.GTE]: 'greater than or equal',
  [FilterOperator.LT]: 'less than',
  [FilterOperator.LTE]: 'less than or equal',
  [FilterOperator.NE]: 'not equal',
  [FilterOperator.EXISTS]: 'exists',
  [FilterOperator.LIKE]: 'contains',
  [FilterOperator.NOT_LIKE]: 'does not contains',
  [FilterOperator.START_WITH]: 'start with',
  [FilterOperator.END_WITH]: 'end with',
};

export function isFilterOperator(v: unknown): v is FilterOperator {
  return (
    v === FilterOperator.EQ ||
    v === FilterOperator.GT ||
    v === FilterOperator.GTE ||
    v === FilterOperator.LT ||
    v === FilterOperator.LTE ||
    v === FilterOperator.NE ||
    v === FilterOperator.EXISTS ||
    v === FilterOperator.LIKE ||
    v === FilterOperator.NOT_LIKE ||
    v === FilterOperator.START_WITH ||
    v === FilterOperator.END_WITH
  );
}
