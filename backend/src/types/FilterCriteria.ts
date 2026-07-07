import { FilterOperator, isFilterOperator } from '@/enums/FilterOperator';

export const __NO_FILTER__ = '__NO_FILTER__';

export interface FilterCriteria {
  field: string;
  operator: FilterOperator | string;
  value: string;
}

export function isFilterCriteria(v: unknown): v is FilterCriteria {
  return (
    typeof v === 'object' &&
    v !== null &&
    'field' in v &&
    'operator' in v &&
    'value' in v &&
    typeof (v as FilterCriteria).field === 'string' &&
    typeof (v as FilterCriteria).operator === 'string' &&
    typeof (v as FilterCriteria).value === 'string' &&
    isFilterOperator((v as FilterCriteria).operator)
  );
}
