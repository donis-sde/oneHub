const META_GRAPH_API_BASE = 'https://graph.facebook.com/v20.0';

export interface MetaErrorPayload {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export type JsonMap = Record<string, unknown>;

export class MetaClient {
  private readonly token: string;

  constructor() {
    const accessToken = process.env.FB_TOKEN;
    if (!accessToken) {
      throw new Error('Missing FB_TOKEN in environment variables');
    }
    this.token = accessToken;
  }

  private sanitizePath(path: string): string {
    const normalized = path.trim();
    if (
      !normalized ||
      normalized.startsWith('/') ||
      normalized.includes('..') ||
      normalized.includes('//') ||
      normalized.includes('?') ||
      normalized.includes('#') ||
      normalized.includes('://') ||
      !/^[A-Za-z0-9_/-]+$/.test(normalized)
    ) {
      throw new Error('Invalid Meta API path');
    }
    return normalized;
  }

  async get<TResponse extends JsonMap>(
    path: string,
    qs?: Record<string, string>,
  ): Promise<TResponse> {
    const safePath = this.sanitizePath(path);
    const url = new URL(`${META_GRAPH_API_BASE}/${safePath}`);
    url.searchParams.set('access_token', this.token);
    if (qs) {
      Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = (await res.json()) as TResponse & MetaErrorPayload;

    if (!res.ok) {
      throw new Error(
        data.error?.message ?? `Meta GET ${path} failed (${res.status})`,
      );
    }
    return data as TResponse;
  }

  async post<TResponse extends JsonMap>(
    path: string,
    body?: Record<string, unknown>,
  ): Promise<TResponse> {
    const safePath = this.sanitizePath(path);
    const url = new URL(`${META_GRAPH_API_BASE}/${safePath}`);
    url.searchParams.set('access_token', this.token);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json()) as TResponse & MetaErrorPayload;

    if (!res.ok) {
      throw new Error(
        data.error?.message ?? `Meta POST ${path} failed (${res.status})`,
      );
    }
    return data as TResponse;
  }

  async del<TResponse extends JsonMap>(
    path: string,
    qs?: Record<string, string>,
  ): Promise<TResponse> {
    const safePath = this.sanitizePath(path);
    const url = new URL(`${META_GRAPH_API_BASE}/${safePath}`);
    url.searchParams.set('access_token', this.token);
    if (qs) {
      Object.entries(qs).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const res = await fetch(url.toString(), { method: 'DELETE' });
    const data = (await res.json()) as TResponse & MetaErrorPayload;

    if (!res.ok) {
      throw new Error(
        data.error?.message ?? `Meta DELETE ${path} failed (${res.status})`,
      );
    }
    return data as TResponse;
  }
}
