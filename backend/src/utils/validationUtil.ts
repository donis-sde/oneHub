// https://stackoverflow.com/a/201447/6873714
export const isEmail = (email: string): boolean => {
  return new RegExp(/^\S+@\S+\.\S+$/).test(email);
};

export const isObj = (v: unknown): v is object => {
  return typeof v === 'object';
};

export const isString = (v: unknown): v is string => {
  return typeof v === 'string';
};

export const isNumber = (v: unknown): v is number => {
  return typeof v === 'number';
};

export const isBoolean = (v: unknown): v is boolean => {
  return typeof v === 'boolean';
};

export const keyIn = <K extends string>(
  key: K,
  v: unknown,
): v is { [k in K]: unknown } => {
  return isObj(v) && key in v;
};
