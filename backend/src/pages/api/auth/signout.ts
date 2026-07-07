// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { CookieKey } from '@/constants/CookieKey';
import { HttpMethod } from '@/enums/HttpMethod';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createAllowRoleMiddleware } from '@/middlewares/createAllowRoleMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import type { NextApiRequest, NextApiResponse } from 'next';

export type SignoutResponse = Record<string, never>;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignoutResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<SignoutResponse>([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.POST]),
      createAllowRoleMiddleware(null),
      async (
        req: NextApiRequest,
        res: NextApiResponse<SignoutResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'SignOut',
        };

        const httpResponse = await signout()();

        applyResponse(httpResponse)(res);
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/auth/signout', { err: `${err}` });
    res.status(500).json({});
  }
}

const signout = () => async (): Promise<HttpResponse<SignoutResponse>> => {
  return {
    status: 200,
    headers: [
      {
        key: 'Set-Cookie',
        value: `${CookieKey.WATI_AUTH}=;expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/`,
      },
    ],
    response: {},
  };
};
