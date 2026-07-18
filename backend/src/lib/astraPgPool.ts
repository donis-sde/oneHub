import { Pool, type QueryResultRow } from 'pg';

/**
 * Allowlisted Astra Postgres databases available to Astra Tools only.
 * Access is read-only (SELECT / introspection). Writes are rejected.
 */
export const ASTRA_TOOL_DATABASES = [
  'astra-insight-mcp',
  'cloudsqladmin',
  'dify',
  'postgres',
  'prod-astra-account-service',
  'prod-astra-ai-benchmark',
  'prod-astra-api-service',
  'prod-astra-composio-mcp',
  'prod-astra-integration',
  'prod-astra-mapping-service',
  'prod-astra-metrics',
  'prod-astra-usage-service',
  'prod_dify',
  'prod_dify_plugin',
] as const;

export type AstraToolDatabase = (typeof ASTRA_TOOL_DATABASES)[number];

export const ASTRA_USAGE_DATABASE: AstraToolDatabase = 'prod-astra-usage-service';
export const ASTRA_ACCOUNT_DATABASE: AstraToolDatabase =
  'prod-astra-account-service';
export const ASTRA_DIFY_DATABASE: AstraToolDatabase = 'prod_dify';

const pools = new Map<string, Pool>();

const WRITE_PATTERN =
  /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|call|execute|merge|replace|vacuum|reindex|cluster|comment|security|set\s+role|set\s+session)\b/i;

export function isAstraToolDatabase(name: string): name is AstraToolDatabase {
  return (ASTRA_TOOL_DATABASES as readonly string[]).includes(name);
}

function getSharedCredentials() {
  const host = process.env.ASTRA_DB_HOST;
  const user = process.env.ASTRA_DB_USER;
  const password = process.env.ASTRA_DB_PASS;
  const port = Number(process.env.ASTRA_DB_PORT ?? '5432');

  if (!host || !user || !password) {
    throw new Error(
      'Astra DB is not configured. Set ASTRA_DB_HOST, ASTRA_DB_USER, and ASTRA_DB_PASS.',
    );
  }

  return {
    host,
    user,
    password,
    port,
    ssl:
      process.env.ASTRA_DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : undefined,
  };
}

export function assertReadOnlySql(sql: string): void {
  const normalized = sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .trim();

  if (!normalized) {
    throw new Error('Empty SQL is not allowed');
  }

  if (WRITE_PATTERN.test(normalized)) {
    throw new Error('Astra Tools DB access is read-only');
  }

  // Allow multiple statements only if every segment is clearly a SELECT/WITH/SHOW/EXPLAIN
  const statements = normalized
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);

  for (const statement of statements) {
    if (!/^(with|select|show|explain|values)\b/i.test(statement)) {
      throw new Error('Astra Tools DB access only allows read queries');
    }
  }
}

export function getAstraPool(database: string): Pool {
  if (!isAstraToolDatabase(database)) {
    throw new Error(`Database "${database}" is not allowed for Astra Tools`);
  }

  const existing = pools.get(database);
  if (existing) {
    return existing;
  }

  const creds = getSharedCredentials();
  const pool = new Pool({
    ...creds,
    database,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Defense in depth: prefer read-only session if role supports it
    options: '-c default_transaction_read_only=on',
  });

  pool.on('error', (err) => {
    console.error(`Astra Postgres pool error (${database})`, err);
  });

  pools.set(database, pool);
  return pool;
}

/** @deprecated Use getAstraPool(ASTRA_USAGE_DATABASE) */
export function getAstraUsagePool(): Pool {
  return getAstraPool(ASTRA_USAGE_DATABASE);
}

export async function astraQuery<T extends QueryResultRow = QueryResultRow>(
  database: string,
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  assertReadOnlySql(text);
  const result = await getAstraPool(database).query<T>(text, params);
  return result.rows;
}

/** @deprecated Use astraQuery(ASTRA_USAGE_DATABASE, ...) */
export async function astraUsageQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
) {
  return astraQuery<T>(ASTRA_USAGE_DATABASE, text, params);
}

export async function pingAstraDatabase(database: string): Promise<{
  database: string;
  ok: boolean;
  error?: string;
  latencyMs?: number;
}> {
  if (!isAstraToolDatabase(database)) {
    return {
      database,
      ok: false,
      error: 'Database is not allowlisted for Astra Tools',
    };
  }

  const started = Date.now();
  try {
    await astraQuery(database, 'SELECT 1 AS ok');
    return {
      database,
      ok: true,
      latencyMs: Date.now() - started,
    };
  } catch (err) {
    return {
      database,
      ok: false,
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listAstraDatabaseStatus() {
  const results = await Promise.all(
    ASTRA_TOOL_DATABASES.map((database) => pingAstraDatabase(database)),
  );
  return {
    host: process.env.ASTRA_DB_HOST ?? null,
    user: process.env.ASTRA_DB_USER ?? null,
    port: Number(process.env.ASTRA_DB_PORT ?? '5432'),
    readOnly: true,
    databases: results,
  };
}

export async function listAstraTables(database: string) {
  return astraQuery<{
    table_schema: string;
    table_name: string;
    table_type: string;
  }>(
    database,
    `
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
    `,
  );
}

export async function listAstraColumns(database: string, tableName: string) {
  return astraQuery<{
    column_name: string;
    data_type: string;
    is_nullable: string;
    column_default: string | null;
  }>(
    database,
    `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName],
  );
}
