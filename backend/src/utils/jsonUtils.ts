import { SerializableType } from '@/types/SerializableDictionary';
import { ObjectId } from 'mongodb';

/* eslint-disable @typescript-eslint/no-explicit-any */
export const getIntersectionKeys = (
  objects: Record<string, any>[],
): string[] => {
  return [
    ...objects
      .map((object) => new Set(Object.keys(object)))
      .reduce(
        (acc, cur) => new Set([...acc].filter((k) => cur.has(k))),
        new Set(),
      ),
  ];
};

export const serialize = (v: unknown): SerializableType => {
  if (v instanceof ObjectId) {
    return v.toString();
  } else if (Array.isArray(v)) {
    return v;
  } else if (typeof v === 'string') {
    return v;
  } else if (typeof v === 'number') {
    return v;
  } else if (typeof v === 'boolean') {
    return v;
  } else if (v instanceof Date) {
    return v.toISOString();
  } else {
    return JSON.stringify(v);
  }
};
