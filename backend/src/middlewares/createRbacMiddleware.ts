import { Role } from '@/enums/Role';
import { EmptyPromiseFunction } from '@/types/EmptyPromiseFunction';
import { NextApiRequest, NextApiResponse } from 'next';
import * as jwtUtils from '@/utils/jwtUtils';
import { isAuthJwt } from '@/types/AuthJwt';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { CookieKey } from '@/constants/CookieKey';
import { getEnv } from '@/utils/getEnv';
import { getServerDiContainer } from '@/global/serverDiContainer';

interface RbacRule {
  roles: Role[] | null;
  httpMethod: HttpMethod;
}

// null mean public
export const createRbacMiddleware =
  (rules: RbacRule[], featureName: BackofficeFeature) =>
  async <R>(
    req: NextApiRequest,
    res: NextApiResponse<R>,
    next?: EmptyPromiseFunction,
  ): Promise<void> => {
    try {
      const { JWT_SECRET } = getEnv();
      const httpMethod = req.method;
      const jwt = req.cookies[CookieKey.WATI_AUTH];

      if (!jwt) {
        res.status(400);

        throw new Error('unauthorized');
      }

      const jwtVerified = jwtUtils.verifyAndDecode(jwt, JWT_SECRET, isAuthJwt);
      const { featureAccessControlDao } = await getServerDiContainer();
      for (const rule of rules) {
        if (
          httpMethod === rule.httpMethod &&
          (rule.roles === null || rule.roles.includes(jwtVerified.role as Role))
        ) {
          if (!req.logContext) {
            req.logContext = {};
          }
          req.logContext.userContext = jwtVerified;

          return next && (await next());
        } else {
          const roleData = await featureAccessControlDao.getByRole(
            jwtVerified.role,
          );
          const feature = roleData?.features.find(
            (f) => f.featureName === featureName,
          );
          if (feature) {
            if (
              (httpMethod === HttpMethod.GET &&
                feature.permissions.includes('read')) ||
              feature.permissions.includes('write')
            ) {
              if (!req.logContext) {
                req.logContext = {};
              }
              req.logContext.userContext = jwtVerified;

              return next && (await next());
            }
          }
        }
      }

      if (featureName && featureName === BackofficeFeature.DELETE_CONTACT) {
        res.status(403).json({ error: 'forbidden' } as R);
      }

      throw new Error('forbidden');
    } catch (err) {
      console.error('createRbacMiddleware', { err });

      throw err;
    }
  };
