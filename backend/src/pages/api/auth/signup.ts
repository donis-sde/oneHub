// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { AdminUserDao } from '@/dataAccess/AdminUserDao';
import {
  AdminUserQueryDto,
  isAdminUserQueryDto,
} from '@/dataAccess/models/AdminUser';
import { HttpMethod } from '@/enums/HttpMethod';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createAllowRoleMiddleware } from '@/middlewares/createAllowRoleMiddleware';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import type { NextApiRequest, NextApiResponse } from 'next';
import winston from 'winston';

export interface SignupResponse {
  success: boolean;
  metadata?: {
    _id: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SignupResponse>,
): Promise<void> {
  try {
    const { logger } = await getServerDiContainer();
    await middlewareFlattener<SignupResponse>([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.POST]),
      createAllowRoleMiddleware(null),
      async (
        req: NextApiRequest,
        res: NextApiResponse<SignupResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'SignUp',
        };
        logger.debug('body', {
          body: req.body,
          loggerMetadata,
        });

        if (!isAdminUserQueryDto(req.body)) {
          throw new Error('bad_request');
        }

        const { adminUserDao } = await getServerDiContainer();
        const httpResponse = await signup(
          req.body,
          logger,
          loggerMetadata,
        )(adminUserDao);

        applyResponse(httpResponse)(res);
      },
    ])(req, res);
  } catch (err) {
    console.error('/api/auth/signup:error', { err: `${err}` });

    res.status(500).json({ success: false, error: `internal_server_error` });
  }
}

const signup =
  (
    { email, password }: AdminUserQueryDto,
    logger: winston.Logger,
    loggerMetadata: BackofficePortalLoggingMetadata,
  ) =>
  async (adminUserDao: AdminUserDao): Promise<HttpResponse<SignupResponse>> => {
    const clonedLoggerMetadata = {
      ...loggerMetadata,
      functionName: 'signup',
    };

    try {
      const { _id } = await adminUserDao.createAdminUser({ email, password });

      logger.debug('params', {
        id: _id.toString(),
        loggerMetadata: clonedLoggerMetadata,
      });

      return {
        status: 200,
        response: { success: true, metadata: { _id: _id.toString() } },
      };
    } catch (err) {
      logger.error('signup', {
        error: err,
        loggerMetadata: clonedLoggerMetadata,
      });

      return {
        status: 400,
        response: { success: false, error: `${err}` },
      };
    }
  };
