function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }
  const record = body as {
    error?: string | { message?: string };
  };
  if (typeof record.error === 'string') {
    return record.error;
  }
  if (record.error && typeof record.error.message === 'string') {
    return record.error.message;
  }
  return undefined;
}

export class HttpError extends Error {
  readonly status: number;

  readonly body: unknown;

  constructor(status: number, body: unknown) {
    const msg = extractErrorMessage(body) ?? `Request failed (${status})`;
    super(msg);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

export async function fetchWabaJson<T>(
  input: RequestInfo,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, init);
  const data = (await res.json()) as unknown;
  if (!res.ok) {
    throw new HttpError(res.status, data);
  }
  return data as T;
}

export function formatPayload(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export function errorPayload(e: unknown, fallback: string): unknown {
  if (e instanceof HttpError) {
    return e.body;
  }
  const msg = e instanceof Error ? e.message : fallback;
  return { error: msg };
}
