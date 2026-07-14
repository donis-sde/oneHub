// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { AdminUserDto } from '@/types/User';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import type { NextApiRequest, NextApiResponse } from 'next';

export type GetMeResponse = { user: AdminUserDto | null };

/**
 * Soft session endpoint: returns the current user when a valid auth cookie is
 * present, otherwise `{ user: null }` with 200. Do not require RBAC here —
 * missing cookies used to throw from createRbacMiddleware and surface as 500.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMeResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<GetMeResponse>([
      createLogContextMiddleware(),
      async (
        req: NextApiRequest,
        res: NextApiResponse<GetMeResponse>,
        _next?: EmptyPromiseFunction,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'GetMe',
        };

        logger.debug('req after middleware', {
          headers: req.headers,
          loggerMetadata: loggerMetadata,
        });

        try {
          const user = extractUserFromHeaders(
            req.headers,
            loggerMetadata,
            logger,
          );
          res.status(200).json({ user });
        } catch {
          // Invalid / expired cookie — treat as signed out
          res.status(200).json({ user: null });
        }
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/auth/me', { err: `${err}` });
    res.status(500).json({ user: null });
  }
}
