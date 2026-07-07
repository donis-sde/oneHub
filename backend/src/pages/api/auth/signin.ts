// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

import { CookieKey } from '@/constants/CookieKey';
import * as jwtUtils from '@/utils/jwtUtils';
import { AuthJwt, isAuthJwt } from '@/types/AuthJwt';
import { AdminUserDao } from '@/dataAccess/AdminUserDao';
import {
  AdminUserQueryDto,
  isAdminUserQueryDto,
} from '@/dataAccess/models/AdminUser';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { createHttpMethodMiddleware } from '@/middlewares/createHttpMethodMiddleware';
import { createAllowRoleMiddleware } from '@/middlewares/createAllowRoleMiddleware';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { HttpMethod } from '@/enums/HttpMethod';
import { getEnv } from '@/utils/getEnv';
import { NodeEnv } from '@/enums/NodeEnv';
import { getServerDiContainer } from '@/global/serverDiContainer';
import winston from 'winston';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { SigninResponse } from './_interface';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SigninResponse>,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  try {
    await middlewareFlattener<SigninResponse>([
      createLogContextMiddleware(),
      createHttpMethodMiddleware([HttpMethod.POST]),
      createAllowRoleMiddleware(null),
      async (
        req: NextApiRequest,
        res: NextApiResponse<SigninResponse>,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'handler',
          API: 'SignIn',
        };

        logger.debug('body', {
          body: req.body,
          loggerMetadata,
        });
        if (!isAdminUserQueryDto(req.body)) {
          throw new Error('bad_request');
        }

        const { adminUserDao } = await getServerDiContainer();
        const httpResponse = await signin(
          req.body,
          logger,
          loggerMetadata,
        )(adminUserDao);

        applyResponse(httpResponse)(res);
      },
    ])(req, res);
  } catch (err) {
    logger.error('/api/auth/signin:error', { err: `${err}` });

    res.status(500).json({ success: false, error: `internal_server_error` });
  }
}

const signin =
  (
    adminUserQueryDto: AdminUserQueryDto,
    logger: winston.Logger,
    loggerMetadata: BackofficePortalLoggingMetadata,
  ) =>
  async (adminUserDao: AdminUserDao): Promise<HttpResponse<SigninResponse>> => {
    const clonedLoggerMetadata = {
      ...loggerMetadata,
      functionName: 'signin',
    };

    try {
      const { JWT_SECRET, NODE_ENV } = getEnv();
      const { email, password } = adminUserQueryDto;

      const adminUser = await adminUserDao.queryAdminUserByEmailAndPassword({
        email,
        password,
      });

      if (!adminUser) {
        throw new Error('auth_error');
      }

      logger.debug('signin:adminUser found', {
        _id: adminUser._id,
        email: adminUser.email,
        loggerMetadata: clonedLoggerMetadata,
      });

      const token = jwtUtils.encode<AuthJwt>(
        {
          role: adminUser.role,
          email: adminUser.email,
        },
        JWT_SECRET,
        isAuthJwt,
      );

      const ONE_DAY_SECONDS = 24 * 60 * 60;
      const COOKIE_IS_SECURE = NODE_ENV !== NodeEnv.DEVELOPMENT;
      const expires = new Date(
        Date.now() + ONE_DAY_SECONDS * 1000,
      ).toUTCString();

      return {
        status: 200,
        headers: [
          {
            key: 'Set-Cookie',
            value: `${CookieKey.WATI_AUTH}=${token}; HttpOnly; ${
              COOKIE_IS_SECURE ? 'Secure; ' : ''
            }Max-Age=${ONE_DAY_SECONDS}; Expires=${expires}; Path=/`,
          },
        ],
        response: {
          success: true,
          metadata: { adminUser: adminUserDao.transformData(adminUser) },
        },
      };
    } catch (err) {
      logger.error('signin error', {
        error: err,
        loggerMetadata: clonedLoggerMetadata,
      });

      return {
        status: 500,
        headers: [],
        response: { success: false, error: `${err}` },
      };
    }
  };
