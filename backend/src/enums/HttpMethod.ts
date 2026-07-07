export enum HttpMethod {
  GET = 'GET',
  HEAD = 'HEAD',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  CONNECT = 'CONNECT',
  OPTIONS = 'OPTIONS',
  TRACE = 'TRACE',
  PATCH = 'PATCH',
}

export function isHttpMethod(v: unknown): v is HttpMethod {
  return (
    v === HttpMethod.GET ||
    v === HttpMethod.HEAD ||
    v === HttpMethod.POST ||
    v === HttpMethod.PUT ||
    v === HttpMethod.DELETE ||
    v === HttpMethod.CONNECT ||
    v === HttpMethod.OPTIONS ||
    v === HttpMethod.TRACE ||
    v === HttpMethod.PATCH
  );
}
