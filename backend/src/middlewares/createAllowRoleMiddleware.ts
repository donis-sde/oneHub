import { Role } from '@/enums/Role';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { NextApiRequest, NextApiResponse } from 'next';
import * as jwtUtils from '@/utils/jwtUtils';
import { isAuthJwt } from '@/types/AuthJwt';
import { getEnv } from '@/utils/getEnv';

// null mean public
export const createAllowRoleMiddleware =
  (allowedRoles: Role[] | null) =>
  async <R>(
    req: NextApiRequest,
    res: NextApiResponse<R>,
    next?: EmptyPromiseFunction,
  ): Promise<void> => {
    try {
      const { JWT_SECRET } = getEnv();

      if (allowedRoles === null) {
        return next && (await next());
      }

      const { authorization } = req.headers;

      if (!authorization) {
        throw new Error('unauthorized');
      }

      const [type, jwt] = authorization.split(' ');

      if (type !== 'Bearer' || !jwt) {
        throw new Error('forbidden');
      }

      const jwtVerified = jwtUtils.verifyAndDecode(jwt, JWT_SECRET, isAuthJwt);

      if (!(allowedRoles as string[]).includes(jwtVerified.role)) {
        throw new Error('forbidden');
      }

      next && (await next());
    } catch (err) {
      console.error('createAllowRoleMiddleware', { err });

      throw new Error('internal_server_error');
    }
  };
