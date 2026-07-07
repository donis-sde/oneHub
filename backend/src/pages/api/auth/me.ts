// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { HttpMethod } from '@/enums/HttpMethod';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { AdminUserDto } from '@/types/User';
import { extractUserFromHeaders } from '@/utils/extractUser';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import type { NextApiRequest, NextApiResponse } from 'next';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

export type GetMeResponse = { user: AdminUserDto | null };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GetMeResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<GetMeResponse>([
      createLogContextMiddleware(),
      createRbacMiddleware(
        [
          {
            httpMethod: HttpMethod.GET,
            roles: null,
          },
        ],
        BackofficeFeature.NO_FEATURE,
      ),
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
        const user = extractUserFromHeaders(
          req.headers,
          loggerMetadata,
          logger,
        );

        res.status(200).json({ user });
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/auth/me', { err: `${err}` });
    res.status(500).json({ user: null });
  }
}
