import {
  FilterCriteria,
  isFilterCriteria,
} from '@/types/FilterCriteria';
import { FilterOperator, isFilterOperator } from '@/enums/FilterOperator';
import mongoose, { FilterQuery } from 'mongoose';
import * as R from 'ramda';

export const extractSubtype = (
  schema: mongoose.Schema,
  field: string,
): string | null => {
  const targetFieldPath = schema.path(field);
  if ('enumValues' in targetFieldPath) {
    // enum
    return `${targetFieldPath.enumValues}`;
  } else if (
    'caster' in targetFieldPath &&
    typeof targetFieldPath.caster === 'object' &&
    !!targetFieldPath.caster &&
    'instance' in targetFieldPath.caster &&
    typeof targetFieldPath.caster?.instance === 'string'
  ) {
    // array
    // NOTE: might not be future-compatible since it is not recorded in API docs
    return targetFieldPath.caster?.['instance'];
  } else if ('schema' in targetFieldPath) {
    // object
    return JSON.stringify(
      R.map((value) => value.instance, targetFieldPath.schema.paths),
    );
  } else {
    return null;
  }
};

const parseFilterCriteria = (
  criteria: string,
): Partial<FilterQuery<unknown>> => {
  // split criteria by first occurrence of :
  const [operator, value] = decodeURIComponent(criteria).split(/:(.*)/s);
  if (!isFilterOperator(operator) || typeof value === 'undefined') {
    return {};
  }

  switch (operator) {
    case FilterOperator.LIKE:
      return { ['$regex']: new RegExp(value) };
    case FilterOperator.NOT_LIKE:
      return {
        // TODO: fix typing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ['$not' as any]: { ['$regex']: new RegExp(value) },
      };
    case FilterOperator.START_WITH:
      return { ['$regex']: new RegExp(`^${value}`) };
    case FilterOperator.END_WITH:
      return { ['$regex']: new RegExp(`${value}$`) };
    default:
      return { [`$${operator}`]: value };
  }
};
// RHS Colon is being used, e.g. user_id=gt:100
export const filterQueryParamsParser = <P extends Record<string, unknown>>(
  filterParams: Record<string, string[] | string | undefined>,
): Record<string, Partial<FilterQuery<unknown>>> => {
  return R.mapObjIndexed((criterias: string[] | string) => {
    if (Array.isArray(criterias)) {
      // multiple criteria
      return R.mergeAll(
        criterias.map((criteria) => parseFilterCriteria(criteria)),
      );
    } else {
      // one criteria
      const criteria = criterias;

      return parseFilterCriteria(criteria);
    }
  }, R.reject(R.isNil, filterParams));
};

export const parseFilterObject = (
  filterParams: FilterCriteria[],
): Record<string, Partial<Record<`$${FilterOperator}`, string>>> => {
  return R.pipe(
    R.filter((v: FilterCriteria) => {
      return (
        !!v.field &&
        isFilterOperator(v.operator as FilterOperator) &&
        typeof v.value !== 'undefined'
      );
    }),
    R.map((filterParam) => {
      return {
        [filterParam.field]: {
          [`$${filterParam.operator}`]: filterParam.value,
        },
      };
    }),
    R.mergeAll,
  )(filterParams);
};

export const filterCriteriaToQueryParamsObject = (
  filters: FilterCriteria[],
  availableFields: string[],
): Record<string, string> => {
  const filterCriteriaFilters =
    filters && filters.length > 0
      ? filters
          .filter(isFilterCriteria)
          .filter((filter) => availableFields.includes(filter.field))
      : [];

  return filterCriteriaFilters.length > 0
    ? R.mergeAll(
        filterCriteriaFilters.map((filter) => ({
          [filter.field]: `${filter.operator}:${filter.value}`,
        })),
      )
    : {};
};
