/* eslint-disable @typescript-eslint/no-explicit-any */

// https://stackoverflow.com/a/48768775/6873714
export const getEnumValues = <R extends string | number>(
  e: Record<string, R>,
): R[] => {
  return Object.entries(e).map(([_k, v]) => v);
};
