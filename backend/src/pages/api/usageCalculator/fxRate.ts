/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { CookieKey } from '@/constants/CookieKey';
import { getEnv } from '@/utils/getEnv';
import * as jwtUtils from '@/utils/jwtUtils';
import { isAuthJwt } from '@/types/AuthJwt';
import {
  getInrToUsdRate,
  setInrToUsdRate,
} from '@/utils/usageCalculatorFxRate';

const rbacPut = createRbacMiddleware(
  [{ httpMethod: HttpMethod.PUT, roles: [Role.ADMIN] }],
  BackofficeFeature.USAGE_CALCULATOR,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GET is public (no auth): for Retool and unauthenticated clients.
  // If a valid backoffice session cookie is present, canUpdate is true for admins only.
  if (req.method === 'GET') {
    try {
      const rate = await getInrToUsdRate();
      let canUpdate = false;
      const jwt = req.cookies[CookieKey.WATI_AUTH];
      if (jwt) {
        try {
          const { JWT_SECRET } = getEnv();
          const jwtVerified = jwtUtils.verifyAndDecode(
            jwt,
            JWT_SECRET,
            isAuthJwt,
          );
          canUpdate = jwtVerified.role === Role.ADMIN;
        } catch {
          // Invalid or expired cookie — still return rate, no update permission
        }
      }
      return res.status(200).json({ inrToUsdRate: rate, canUpdate });
    } catch (err) {
      console.error('Usage calculator fxRate GET error:', err);
      return res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to get FX rate',
      });
    }
  }

  if (req.method === 'PUT') {
    return rbacPut(req, res, async () => {
      try {
        const body = req.body ?? {};
        const rate = Number(body.inrToUsdRate);
        if (Number.isNaN(rate) || rate <= 0) {
          return res.status(400).json({
            error: 'inrToUsdRate must be a positive number',
          });
        }
        await setInrToUsdRate(rate);
        return res.status(200).json({ inrToUsdRate: rate });
      } catch (err) {
        console.error('Usage calculator fxRate PUT error:', err);
        return res.status(500).json({
          error:
            err instanceof Error ? err.message : 'Failed to update FX rate',
        });
      }
    });
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
