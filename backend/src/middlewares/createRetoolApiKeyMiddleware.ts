import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { NextApiRequest, NextApiResponse } from 'next';
import { getEnv } from '@/utils/getEnv';

export const createRetoolApiKeyMiddleware =
  () =>
  async <R>(
    req: NextApiRequest,
    res: NextApiResponse<R>,
    next?: EmptyPromiseFunction,
  ): Promise<void> => {
    try {
      const { RETOOL_API_KEY } = getEnv();
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        res.status(401).json({ error: 'API key required' } as R);
        return;
      }

      if (!RETOOL_API_KEY) {
        console.error('RETOOL_API_KEY not configured in environment');
        res.status(500).json({ error: 'Server configuration error' } as R);
        return;
      }

      if (apiKey !== RETOOL_API_KEY) {
        res.status(401).json({ error: 'Invalid API key' } as R);
        return;
      }

      // Add retool context to request logging
      if (!req.logContext) {
        req.logContext = {};
      }
      req.logContext.functionName = 'retoolApiKeyMiddleware';
      req.logContext.userContext = { role: 'retool', email: 'retool@api' };

      return next && (await next());
    } catch (err) {
      console.error('createRetoolApiKeyMiddleware', { err });
      res.status(500).json({ error: 'Authentication error' } as R);
    }
  };
