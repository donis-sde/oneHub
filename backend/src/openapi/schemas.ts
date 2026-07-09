export const componentSchemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      error: { type: 'string', example: 'Unauthorized' },
      err: { type: 'string', example: 'bad_request' },
      success: { type: 'boolean', example: false },
    },
  },
  SigninRequest: {
    type: 'object',
    required: ['email', 'password'],
    properties: {
      email: { type: 'string', format: 'email', example: 'admin@example.com' },
      password: { type: 'string', format: 'password', example: 'your-password' },
    },
  },
  SignupRequest: {
    type: 'object',
    required: ['email', 'password', 'role'],
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', format: 'password' },
      role: { type: 'string', example: 'ADMIN' },
    },
  },
  AdminUser: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      email: { type: 'string', format: 'email' },
      role: { type: 'string', example: 'ADMIN' },
      someMap: {
        type: 'object',
        properties: {
          someNumber: { type: 'number' },
          someString: { type: 'string' },
        },
      },
      someArray: { type: 'array', items: { type: 'string' } },
      someArray2: { type: 'array', items: { type: 'number' } },
    },
  },
  SigninResponse: {
    type: 'object',
    required: ['success'],
    properties: {
      success: { type: 'boolean', example: true },
      metadata: {
        type: 'object',
        properties: {
          adminUser: { $ref: '#/components/schemas/AdminUser' },
        },
      },
      error: { type: 'string' },
    },
  },
  AuthMeResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      metadata: {
        type: 'object',
        properties: {
          adminUser: { $ref: '#/components/schemas/AdminUser' },
        },
      },
      error: { type: 'string' },
    },
  },
  HealthCheckResponse: {
    type: 'object',
    description: 'Empty object on success',
    additionalProperties: false,
  },
  PaginationQuery: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 0, example: 0 },
      pageSize: { type: 'integer', minimum: 1, example: 25 },
      sort: { type: 'string', example: 'createdAt' },
      order: { type: 'string', enum: ['asc', 'desc'], example: 'desc' },
    },
  },
  MongooseFilterQuery: {
    type: 'object',
    description: 'MongoDB-style filter object passed as query params or body',
    additionalProperties: true,
    example: { email: { $regex: 'example' } },
  },
  GenericObject: {
    type: 'object',
    description: 'Dynamic JSON payload — see route handler for exact fields',
    additionalProperties: true,
  },
  DatabaseCollectionListResponse: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: { $ref: '#/components/schemas/GenericObject' },
      },
      total: { type: 'integer' },
      page: { type: 'integer' },
      pageSize: { type: 'integer' },
    },
  },
  WabaRegisterRequest: {
    type: 'object',
    properties: {
      wabaId: { type: 'string' },
      phoneNumberId: { type: 'string' },
      tenantId: { type: 'string' },
    },
  },
  PrmGatewayPartnerRequest: {
    type: 'object',
    properties: {
      partnerId: { type: 'string' },
      name: { type: 'string' },
      email: { type: 'string', format: 'email' },
    },
    additionalProperties: true,
  },
};

export interface RouteSchemaOverride {
  requestBody?: string;
  response?: string;
  parameters?: Array<{
    name: string;
    in: 'path' | 'query' | 'header';
    required?: boolean;
    schema: Record<string, unknown>;
    description?: string;
  }>;
}

export const routeSchemaOverrides: Record<string, RouteSchemaOverride> = {
  'POST /api/auth/signin': {
    requestBody: 'SigninRequest',
    response: 'SigninResponse',
  },
  'POST /api/auth/signup': {
    requestBody: 'SignupRequest',
    response: 'SigninResponse',
  },
  'GET /api/auth/me': {
    response: 'AuthMeResponse',
  },
  'GET /api/healthCheck': {
    response: 'HealthCheckResponse',
  },
  'GET /api/databases/{database}/collections/{collection}': {
    response: 'DatabaseCollectionListResponse',
    parameters: [
      {
        name: 'database',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Database name',
      },
      {
        name: 'collection',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Collection name',
      },
    ],
  },
  'GET /api/databases/{database}/collections/{collection}/{id}': {
    response: 'GenericObject',
    parameters: [
      { name: 'database', in: 'path', required: true, schema: { type: 'string' } },
      {
        name: 'collection',
        in: 'path',
        required: true,
        schema: { type: 'string' },
      },
      { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
    ],
  },
  'POST /api/waba/register': {
    requestBody: 'WabaRegisterRequest',
    response: 'GenericObject',
  },
  'POST /api/prmGateway/createPartner': {
    requestBody: 'PrmGatewayPartnerRequest',
    response: 'GenericObject',
  },
  'POST /api/prmGateway/updatePartner': {
    requestBody: 'PrmGatewayPartnerRequest',
    response: 'GenericObject',
  },
};
