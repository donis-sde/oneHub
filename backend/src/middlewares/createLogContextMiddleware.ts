import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { NextApiResponse, NextApiRequest } from 'next';
import { v4 as uuid } from 'uuid';
import { extractGCPTraceContext } from '@/utils/loggingUtils';
import { getServerDiContainer } from '@/global/serverDiContainer';

export const createLogContextMiddleware =
  () =>
  async <R>(
    req: NextApiRequest,
    res: NextApiResponse<R>,
    next?: EmptyPromiseFunction,
  ): Promise<void> => {
    const { logger } = await getServerDiContainer();

    try {
      if (!req.logContext) {
        req.logContext = {};
      }
      const transparentHeader = req.headers['traceparent'];
      if (typeof transparentHeader === 'string') {
        const loggingMetadata = extractGCPTraceContext(transparentHeader);
        req.logContext = loggingMetadata;
      }
      if (!req.logContext.traceId || !req.logContext.spanId) {
        req.logContext.traceId = uuid();
        req.logContext.spanId = uuid();
      }
      res.setHeader('X-Request-ID', req.logContext.traceId);

      return next && (await next());
    } catch (err) {
      logger.error('createLogContextMiddleware', { err });

      throw err;
    }
  };
