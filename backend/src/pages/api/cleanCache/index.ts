import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/enums/HttpMethod';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { CleanCacheLog } from '@/dataAccess/models/CleanCacheLog';
import { extractUserFromHeaders } from '@/utils/extractUser';

const WATI_MT_SERVER_URL = process.env.WATI_MT_SERVER_URL;

interface CleanCacheRequest extends NextApiRequest {
  body: {
    clientId: string;
  };
}

export type CleanCacheResponse = {
  message: string | null;
};

export default async function handler(
  req: CleanCacheRequest,
  res: NextApiResponse<CleanCacheResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await middlewareFlattener<CleanCacheResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.CLEAN_CACHE,
      ),
      async (
        req: CleanCacheRequest,
        res: NextApiResponse<CleanCacheResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const { cleanCacheLogDao } = await getServerDiContainer();
        const { clientId } = req.body;

        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'CleanCache',
        };
        const user = extractUserFromHeaders(
          req.headers,
          loggerMetadata,
          logger,
        );
        logger.debug('req after middleware', {
          headers: req.headers,
          loggerMetadata: loggerMetadata,
          body: req.body,
        });

        if (!clientId) {
          res.status(400).json({ message: 'ClientId is required' });
          return;
        }

        const cleanCacheApiUrl = `${WATI_MT_SERVER_URL}/${clientId}/api/v1/cleanCache`;
        const apiResponse = await fetch(cleanCacheApiUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const apiResponseData = await apiResponse.json();
        logger.info('apiResponseData', { apiResponseData });
        const cleanCacheLogCreateResponse = await cleanCacheLogDao.insertMany([
          new CleanCacheLog(clientId, user?.email ?? '', new Date()),
        ]);

        logger.info('cleanCacheLogCreateResponse', {
          cleanCacheLogCreateResponse,
        });
        return res.status(200).json({ message: 'Cache cleaned successfully' });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/cleanCache/', { err: `${err}` });
    res.status(500).json({ message: 'Error cleaning cache' });
  }
}
