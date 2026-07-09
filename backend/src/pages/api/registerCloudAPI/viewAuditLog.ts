import { getServerDiContainer } from '@/global/serverDiContainer';
import { NextApiRequest, NextApiResponse } from 'next';
import { Paginated, Paginator } from '@/types/Pagination';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Document } from 'mongodb';

type GetAuditLogResponse = Paginated<Document>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetAuditLogResponse>,
): Promise<void> {
  const { logger, registerCloudAPIAuditLogCollection } =
    await getServerDiContainer();

  try {
    await middlewareFlattener<GetAuditLogResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.GET,
            roles: null,
          },
        ],
        BackofficeFeature.REGISTER_CLOUD_API,
      ),
      async (
        req: NextApiRequest,
        res: NextApiResponse<GetAuditLogResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'RegisterCloudAPI',
        };

        const { skip: skipRaw = '0', limit: limitRaw = '50' } = req.query;
        const skip = typeof skipRaw === 'string' ? parseInt(skipRaw) : 0;
        const limit = typeof limitRaw === 'string' ? parseInt(limitRaw) : 50;
        const auditLogs = await registerCloudAPIAuditLogCollection
          .find({}, { skip: skip * limit, limit, sort: { timestamp: -1 } })
          .toArray();
        const count = await registerCloudAPIAuditLogCollection.countDocuments();

        logger.debug('auditLogs', { auditLogs });

        res.status(200).json({
          data: auditLogs,
          paginator: {
            skip: skip ?? 0,
            limit: limit ?? 50,
          },
          count,
          hasNext: skip !== null && skip * limit + limit < count,
        });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/registerCloudAPI/register:error', { err: `${err}` });

    res.status(500).json({
      data: [],
      paginator: {
        skip: 0,
        limit: 0,
      },
      count: 0,
      hasNext: false,
    });
  }
}
