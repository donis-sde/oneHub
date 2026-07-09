import { __NO_FILTER__ } from '@/types/FilterCriteria';
import { isFilterOperator } from '@/enums/FilterOperator';
import { FilterOperator } from '@/enums/FilterOperator';

export type Filter = {
  field: string | null;
  operator: FilterOperator;
  value: string | null;
};

export type FilledFilter = Omit<Filter, 'field' | 'value'> & {
  field: string;
} & { value: string };

/*
Expected input: {
  field: 'BackendDomain',
  operator: FilterOperator.EQ,
  
}
*/
export function isFilledFilter(v: Filter): v is FilledFilter {
  return (
    typeof v.field === 'string' &&
    !!v.field &&
    typeof v.value === 'string' &&
    !!v.value &&
    isFilterOperator(v.operator) &&
    v.field !== __NO_FILTER__
  );
}

export type QueryParamFilter = [string, FilterOperator, string];

// Expected input: ['BackendDomain', 'eq', 'attacker.gl.com']
export function isQueryParamFilter(v: string[]): v is QueryParamFilter {
  return (
    Array.isArray(v) &&
    v.length === 3 &&
    typeof v[0] === 'string' &&
    typeof v[2] === 'string' &&
    !!v[0] &&
    !!v[2] &&
    isFilterOperator(v[1])
  );
}
