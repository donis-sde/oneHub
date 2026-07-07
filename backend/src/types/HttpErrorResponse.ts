import { isString } from '@/utils/validationUtil';

export interface HttpErrorResponse {
  err: string;
}

export function isHttpErrorResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
): obj is HttpErrorResponse {
  return (
    typeof obj === 'object' && !!obj && 'err' in obj && isString(obj['err'])
  );
}
