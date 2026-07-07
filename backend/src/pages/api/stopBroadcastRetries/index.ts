import { NextApiRequest, NextApiResponse } from 'next';
import { HttpMethod } from '@/enums/HttpMethod';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { BroadcastType } from '@/enums/Broadcast';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { StopBroadcastLog } from '@/dataAccess/models/StopBroadcastRetries';

const WATI_BE_SERVER_URL = process.env.WATI_MT_SERVER_URL;
const WATI_BE_SERVER_URL_API_KEY = process.env.WATI_BE_SERVER_URL_API_KEY;

interface StopBroadcastRetriesRequest extends NextApiRequest {
  body: {
    tenantId: string;
    broadcastId: string;
    slackUrl: string;
  };
}

export type StopBroadcastRetriesResponse = {
  message: string | null;
};

export default async function handler(
  req: StopBroadcastRetriesRequest,
  res: NextApiResponse<StopBroadcastRetriesResponse>,
): Promise<void> {
  const { logger, stopBroadcastLogDao } = await getServerDiContainer();

  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  try {
    await middlewareFlattener<StopBroadcastRetriesResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.POST,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.STOP_BROADCAST_RETRIES,
      ),
      async (
        req: StopBroadcastRetriesRequest,
        res: NextApiResponse<StopBroadcastRetriesResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const { tenantId, broadcastId, slackUrl } = req.body;
        if (!tenantId || !broadcastId) {
          res
            .status(400)
            .json({ message: 'Tenant ID and Broadcast Name are required' });
          return;
        }

        const sanitizedSlackUrl =
          typeof slackUrl === 'string' && slackUrl.trim() !== ''
            ? slackUrl
            : '';

        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'StopBroadcastRetries',
        };

        const user = extractUserFromHeaders(
          req.headers,
          loggerMetadata,
          logger,
        );
        logger.debug('Request received', {
          headers: req.headers,
          body: req.body,
        });

        if (!tenantId || !broadcastId) {
          res
            .status(400)
            .json({ message: 'tenantId and broadcastName are required' });
          return;
        }

        const stopRetriesUrl = `${WATI_BE_SERVER_URL}/${tenantId}/api/v2/backoffice-portal/stop-retry-broadcast`;
        const apiResponse = await fetch(stopRetriesUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            PricingApiKey: `${WATI_BE_SERVER_URL_API_KEY}`,
          },
          body: JSON.stringify({
            tenant_id: tenantId,
            broadcast_id: broadcastId,
          }),
        });

        if (apiResponse.status != 200) {
          res
            .status(apiResponse.status)
            .json({ message: 'Failed to stop broadcast retries' });
          return;
        }

        const responseData = await apiResponse.json();
        if (!responseData.ok) {
          logger.error('Failed to stop broadcast retries', { responseData });
          res.status(400).json({ message: responseData.message });
          return;
        }

        const logEntry = new StopBroadcastLog(
          tenantId,
          broadcastId,
          sanitizedSlackUrl,
          BroadcastType.Retry,
          user?.email ?? 'Unknown',
          new Date(),
        );
        await stopBroadcastLogDao.insertMany([logEntry]);

        logger.debug('Broadcast retries stopped successfully', {
          tenantId,
          broadcastId,
        });

        res
          .status(200)
          .json({ message: 'Broadcast retries stopped successfully' });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/stopBroadcastRetries', { err: `${err}` });
    res.status(500).json({ message: 'Error stopping broadcast retries' });
  }
}
