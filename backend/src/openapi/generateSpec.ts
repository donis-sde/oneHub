import { scanApiRoutes, type ApiRoute } from './scanRoutes';
import {
  componentSchemas,
  routeSchemaOverrides,
  type RouteSchemaOverride,
} from './schemas';

const openApiPath = (routePath: string): string =>
  routePath.replace(/\[([^\]]+)\]/g, '{$1}');

function schemaRef(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

function getOverride(route: ApiRoute, method: string): RouteSchemaOverride | undefined {
  return routeSchemaOverrides[`${method.toUpperCase()} ${openApiPath(route.path)}`];
}

function pathParameters(routePath: string) {
  const params: Array<{
    name: string;
    in: 'path';
    required: boolean;
    schema: { type: string };
    description: string;
  }> = [];

  for (const match of openApiPath(routePath).matchAll(/\{([^}]+)\}/g)) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `${match[1]} path parameter`,
    });
  }

  return params;
}

function buildOperation(route: ApiRoute, method: string) {
  const isRetool = route.path.startsWith('/api/retool');
  const isAuth = route.path.startsWith('/api/auth');
  const override = getOverride(route, method);
  const responseSchema = override?.response ?? 'GenericObject';
  const parameters = [
    ...pathParameters(route.path),
    ...(override?.parameters ?? []),
  ];

  return {
    summary: route.summary,
    tags: [route.tag],
    ...(parameters.length > 0 ? { parameters } : {}),
    security:
      isAuth && route.path.endsWith('/signin')
        ? []
        : isRetool
          ? [{ ApiKeyAuth: [] }]
          : [{ CookieAuth: [] }],
    responses: {
      '200': {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: schemaRef(responseSchema),
          },
        },
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: schemaRef('ErrorResponse'),
          },
        },
      },
      '403': {
        description: 'Forbidden',
        content: {
          'application/json': {
            schema: schemaRef('ErrorResponse'),
          },
        },
      },
      '500': {
        description: 'Server error',
        content: {
          'application/json': {
            schema: schemaRef('ErrorResponse'),
          },
        },
      },
    },
    ...(method === 'post' || method === 'put' || method === 'patch'
      ? {
          requestBody: {
            required: override?.requestBody ? true : false,
            content: {
              'application/json': {
                schema: schemaRef(override?.requestBody ?? 'GenericObject'),
              },
            },
          },
        }
      : {}),
  };
}

export function generateOpenApiSpec() {
  const routes = scanApiRoutes();
  const paths: Record<string, Record<string, unknown>> = {};

  for (const route of routes) {
    const pathKey = openApiPath(route.path);
    paths[pathKey] = paths[pathKey] ?? {};

    for (const method of route.methods) {
      paths[pathKey][method] = buildOperation(route, method);
    }
  }

  const tags = [...new Set(routes.map((route) => route.tag))]
    .sort()
    .map((name) => ({
      name,
      description: `${name} endpoints`,
    }));

  return {
    openapi: '3.0.3',
    info: {
      title: 'WATI Admin Panel API',
      description:
        'Backend API documentation. Most routes require the WATI_AUTH session cookie (sign in via POST /api/auth/signin). Retool routes use the x-api-key header.',
      version: '1.0.0',
    },
    servers: [{ url: '/', description: 'Current server' }],
    tags,
    paths,
    components: {
      schemas: componentSchemas,
      securitySchemes: {
        CookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'WATI_AUTH',
          description: 'JWT session cookie set by POST /api/auth/signin',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Retool API key (RETOOL_API_KEY env var)',
        },
      },
    },
  };
}
