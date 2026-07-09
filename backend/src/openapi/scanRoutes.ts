import fs from 'fs';
import path from 'path';

export interface ApiRoute {
  path: string;
  methods: string[];
  tag: string;
  summary: string;
}

const SKIP_DIRS = new Set(['__handlers', 'util']);
const SKIP_FILES = new Set([
  '_interface.ts',
  'utils.ts',
  'validateRequest.ts',
  'transactionHandlers.ts',
  'metaClient.ts',
  'rbac.ts',
]);

const METHOD_MAP: Record<string, string> = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  PATCH: 'patch',
  DELETE: 'delete',
};

function extractMethods(fileContent: string): string[] {
  const methods = new Set<string>();

  const middlewareMatch = fileContent.match(
    /createHttpMethodMiddleware\(\[([^\]]+)\]/,
  );
  if (middlewareMatch) {
    for (const token of middlewareMatch[1].split(',')) {
      const method = token.trim().replace('HttpMethod.', '');
      if (METHOD_MAP[method]) {
        methods.add(METHOD_MAP[method]);
      }
    }
  }

  for (const match of fileContent.matchAll(/HttpMethod\.(GET|POST|PUT|PATCH|DELETE)/g)) {
    const mapped = METHOD_MAP[match[1]];
    if (mapped) {
      methods.add(mapped);
    }
  }

  for (const match of fileContent.matchAll(
    /req\.method\s*===\s*['"](GET|POST|PUT|PATCH|DELETE)['"]/g,
  )) {
    const mapped = METHOD_MAP[match[1]];
    if (mapped) {
      methods.add(mapped);
    }
  }

  if (methods.size === 0) {
    methods.add('get');
  }

  return [...methods].sort();
}

function filePathToRoutePath(relativePath: string): string {
  let route = relativePath
    .replace(/\\/g, '/')
    .replace(/\/index\.(tsx?|jsx?)$/, '')
    .replace(/\.(tsx?|jsx?)$/, '');

  if (!route.startsWith('/')) {
    route = `/${route}`;
  }

  return `/api${route}`;
}

function getTag(routePath: string): string {
  const segments = routePath.replace(/^\/api\//, '').split('/');
  return segments[0] || 'general';
}

function getSummary(routePath: string, methods: string[]): string {
  const name = routePath.replace(/^\/api\//, '').replace(/\//g, ' / ');
  return `${methods.join(', ').toUpperCase()} ${name}`;
}

function walkApiDir(dir: string, relativeDir = ''): ApiRoute[] {
  const routes: ApiRoute[] = [];

  if (!fs.existsSync(dir)) {
    return routes;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    const nextRelative = relativeDir
      ? path.join(relativeDir, entry.name)
      : entry.name;

    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      routes.push(...walkApiDir(fullPath, nextRelative));
      continue;
    }

    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      continue;
    }

    if (SKIP_FILES.has(entry.name)) {
      continue;
    }

    if (entry.name.startsWith('_') && entry.name !== 'index.ts') {
      continue;
    }

    const routePath = filePathToRoutePath(nextRelative);
    const fileContent = fs.readFileSync(fullPath, 'utf8');
    const methods = extractMethods(fileContent);

    routes.push({
      path: routePath,
      methods,
      tag: getTag(routePath),
      summary: getSummary(routePath, methods),
    });
  }

  return routes.sort((a, b) => a.path.localeCompare(b.path));
}

export function scanApiRoutes(apiRoot?: string): ApiRoute[] {
  const root =
    apiRoot ?? path.join(process.cwd(), 'src', 'pages', 'api');

  const routes = walkApiDir(root).filter(
    (route) => route.path !== '/api/openapi.json',
  );

  return routes;
}
