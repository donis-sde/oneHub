import * as R from 'ramda';
import { isObj } from './validationUtil';

export const getObjectKeyByCaseInsensitive = (
  o: Record<string, unknown>,
  key: string,
): string | undefined => {
  return Object.keys(o).find((v) => v.toLowerCase() === key.toLowerCase());
};

export const getNestedObjectPathsByKey = (
  o: Record<string, unknown>,
  key: string,
  prefix = '',
  caseInsensitive = true,
): string[] => {
  let result: string[] = [];

  for (const [oKey, _value] of Object.entries(o || {})) {
    if (
      (caseInsensitive && oKey.toLowerCase() === key.toLowerCase()) ||
      oKey === key
    ) {
      result = [...result, `${prefix}${oKey}`];
    } else if (isObj(o[oKey])) {
      const nestedResult = getNestedObjectPathsByKey(
        R.pick(Object.keys((o[oKey] || {}) as object), o[oKey]),
        key,
        `${prefix}${oKey}.`,
      );

      result = [...result, ...nestedResult];
    }
  }

  return result;
};
