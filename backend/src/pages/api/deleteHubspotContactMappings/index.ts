import { MongoClient, MongoClientOptions, ObjectId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/enums/HttpMethod';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { extractUserFromHeaders } from '@/utils/extractUser';

const customOptions: { useUnifiedTopology: boolean } = {
  useUnifiedTopology: true,
};
const options: MongoClientOptions & typeof customOptions = customOptions;

const COLLECTION_NAME = 'HubspotContactMapping';

type Region = 'mt' | 'eu';

interface MappingCriterion {
  id?: string | null;
  waId?: string | null;
  watiContactId?: string | null;
  hsContactId?: string | null;
}

interface DeleteHubspotMappingsBody {
  region?: Region;
  tenantId?: string;
  criteria?: MappingCriterion[] | null;
}

export type DeleteHubspotMappingsResponse = {
  ok: boolean;
  deletedCount?: number;
  message?: string | null;
};

function resolveDbUrlAndName(
  region: Region,
): { dbUrl: string; dbName: string } | { error: string } {
  if (region === 'mt') {
    const dbUrl = process.env.DB_URL;
    const dbName = process.env.MT_DB_NAME;
    if (!dbUrl || !dbName) {
      return {
        error:
          'MT database connection is not configured (DB_URL / MT_DB_NAME).',
      };
    }
    return { dbUrl, dbName };
  }

  const dbUrl = process.env.EU_DB_URL;
  const dbName = process.env.EU_DB_NAME;
  if (!dbUrl || !dbName) {
    return {
      error:
        'EU database connection is not configured (EU_DB_URL / EU_DB_NAME).',
    };
  }
  return { dbUrl, dbName };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteHubspotMappingsResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();

  if (req.method !== HttpMethod.POST) {
    res.status(405).json({ ok: false, message: 'Method not allowed' });
    return;
  }

  try {
    await middlewareFlattener<DeleteHubspotMappingsResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.DELETE_HUBSPOT_CONTACT_MAPPING,
      ),
      async (
        req: NextApiRequest,
        res: NextApiResponse<DeleteHubspotMappingsResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'deleteHubspotContactMappings',
          API: 'deleteHubspotContactMappings',
        };

        const user = extractUserFromHeaders(
          req.headers,
          loggerMetadata,
          logger,
        );

        const body = req.body as DeleteHubspotMappingsBody;
        const region = body?.region;
        const tenantId =
          typeof body?.tenantId === 'string' ? body.tenantId.trim() : '';
        const criteria = Array.isArray(body?.criteria) ? body.criteria : null;

        if (region !== 'mt' && region !== 'eu') {
          res.status(400).json({
            ok: false,
            message: 'region must be "mt" or "eu"',
          });
          return;
        }

        if (!tenantId) {
          res.status(400).json({
            ok: false,
            message: 'tenantId is required',
          });
          return;
        }

        if (!criteria || criteria.length === 0) {
          res.status(400).json({
            ok: false,
            message: 'criteria must be a non-empty array',
          });
          return;
        }

        const mappingIds: ObjectId[] = [];
        const waIds: string[] = [];
        const watiContactIds: string[] = [];
        const hsContactIds: string[] = [];

        for (const criterion of criteria) {
          if (criterion == null) {
            logger.warn('deleteHubspotContactMappings skipped null criterion', {
              ...loggerMetadata,
              tenantId,
              region,
              userEmail: user?.email,
            });
            continue;
          }

          const hasId =
            typeof criterion.id === 'string' && criterion.id.trim() !== '';
          const hasWaId =
            typeof criterion.waId === 'string' && criterion.waId.trim() !== '';
          const hasWatiContactId =
            typeof criterion.watiContactId === 'string' &&
            criterion.watiContactId.trim() !== '';
          const hasHsContactId =
            typeof criterion.hsContactId === 'string' &&
            criterion.hsContactId.trim() !== '';

          const setCount =
            (hasId ? 1 : 0) +
            (hasWaId ? 1 : 0) +
            (hasWatiContactId ? 1 : 0) +
            (hasHsContactId ? 1 : 0);

          if (setCount !== 1) {
            res.status(400).json({
              ok: false,
              message:
                'Each criterion must set exactly one of id, waId, watiContactId, hsContactId',
            });
            return;
          }

          if (hasId) {
            const idVal = criterion.id;
            if (idVal == null) {
              continue;
            }
            const raw = idVal.trim();
            if (!ObjectId.isValid(raw)) {
              res.status(400).json({
                ok: false,
                message: `Invalid mapping id (expected Mongo ObjectId): ${raw}`,
              });
              return;
            }
            mappingIds.push(new ObjectId(raw));
          } else if (hasWaId) {
            const v = criterion.waId;
            if (v != null) {
              waIds.push(v.trim());
            }
          } else if (hasWatiContactId) {
            const v = criterion.watiContactId;
            if (v != null) {
              watiContactIds.push(v.trim());
            }
          } else {
            const v = criterion.hsContactId;
            if (v != null) {
              hsContactIds.push(v.trim());
            }
          }
        }

        const orConditions: Record<string, unknown>[] = [];
        if (mappingIds.length > 0) {
          orConditions.push({ _id: { $in: mappingIds } });
        }
        if (waIds.length > 0) {
          orConditions.push({ WAid: { $in: waIds } });
        }
        if (watiContactIds.length > 0) {
          orConditions.push({ WatiContactId: { $in: watiContactIds } });
        }
        if (hsContactIds.length > 0) {
          orConditions.push({ HSContactId: { $in: hsContactIds } });
        }

        if (orConditions.length === 0) {
          res.status(400).json({
            ok: false,
            message:
              'No valid criteria after parsing (e.g. only null entries).',
          });
          return;
        }

        const resolved = resolveDbUrlAndName(region);
        if ('error' in resolved) {
          res.status(503).json({ ok: false, message: resolved.error });
          return;
        }

        const { dbUrl, dbName } = resolved;

        let client: MongoClient | undefined;
        try {
          client = new MongoClient(dbUrl, options);
          await client.connect();
          const db = client.db(dbName);
          const collection = db.collection(COLLECTION_NAME);

          const filter = {
            TenantId: tenantId,
            $or: orConditions,
          };

          const deleteResult = await collection.deleteMany(filter);

          logger.info('deleteHubspotContactMappings completed', {
            ...loggerMetadata,
            tenantId,
            region,
            dbName,
            userEmail: user?.email ?? 'unknown',
            mappingIdCount: mappingIds.length,
            waIdCount: waIds.length,
            watiContactIdCount: watiContactIds.length,
            hsContactIdCount: hsContactIds.length,
            deletedCount: deleteResult.deletedCount,
          });

          res.status(200).json({
            ok: true,
            deletedCount: deleteResult.deletedCount,
            message: `Deleted ${deleteResult.deletedCount} document(s).`,
          });
        } finally {
          if (client) {
            await client.close();
          }
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/deleteHubspotContactMappings', { err: `${err}` });
    res.status(500).json({
      ok: false,
      message: 'Internal server error',
    });
  }
}
