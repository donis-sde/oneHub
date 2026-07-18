import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { middlewareFlattener } from '@/utils/middlewareFlattener';

type AstraHandler<T> = (
  req: NextApiRequest,
  res: NextApiResponse<T>,
  next?: EmptyPromiseFunction,
) => Promise<void>;

/**
 * Shared RBAC wrapper for Astra Tools APIs (admin-only, NO_FEATURE).
 */
export function withAstraToolsAccess<T>(
  method: HttpMethod,
  handler: AstraHandler<T | { error: string }>,
): NextApiHandler {
  return async (req, res) => {
    const { logger } = await getServerDiContainer();

    if (req.method !== method) {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      await middlewareFlattener([
        createLogContextMiddleware(),
        createRbacMiddleware(
          [
            {
              httpMethod: method,
              roles: [Role.ADMIN],
            },
          ],
          BackofficeFeature.NO_FEATURE,
        ),
        handler,
      ])(req, res);
    } catch (err) {
      logger.error('astra-tools-api', { err: `${err}`, path: req.url });
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Astra Tools request failed',
      });
    }
  };
}
