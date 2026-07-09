import { CookieKey } from '@/constants/CookieKey';
import { AuthJwt, isAuthJwt } from '@/types/AuthJwt';
import { AdminUserDto } from '@/types/User';
import { IncomingHttpHeaders } from 'http';
import qs from 'querystring';
import { getEnv } from './getEnv';
import { verifyAndDecode } from './jwtUtils';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';

export const extractUserFromHeaders = (
  headers: IncomingHttpHeaders,
  loggerMetadata: BackofficePortalLoggingMetadata,
  logger: winston.Logger,
): AdminUserDto | null => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'extractUserFromHeaders',
  };

  try {
    const { JWT_SECRET } = getEnv();

    const cookie = headers.cookie ?? '';
    const jwt = qs.parse(cookie, '; ')[CookieKey.WATI_AUTH];

    if (Array.isArray(jwt)) {
      throw new Error('invalid_cookie');
    }

    if (!jwt) {
      return null;
    }

    const jwtVerified = verifyAndDecode<AuthJwt>(jwt, JWT_SECRET, isAuthJwt);

    return {
      role: jwtVerified.role,
      email: jwtVerified.email,
    };
  } catch (err) {
    logger.error('extractUserFromReq', {
      err,
      loggerMetadata: clonedLoggerMetadata,
    });

    throw err;
  }
};
