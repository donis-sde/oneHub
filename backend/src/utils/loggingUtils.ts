import * as winston from 'winston';
import * as R from 'ramda';
import { klona } from 'klona/full';
import { getNestedObjectPathsByKey } from './objectUtils';
import {
  LoggingMetadata,
  TransformableInfoWithAxiosError,
} from '../types/LogContext';
import { isAxiosError } from 'axios';

export const maskAuthWinstonFormat = (
  info: winston.Logform.TransformableInfo,
  opts: {
    nodeEnv: string;
  },
): winston.Logform.TransformableInfo | boolean => {
  if (opts.nodeEnv === 'development') return info;

  const omittedErrInfo = R.omit(['err'], info);

  const sensitiveInfoKeys = [
    'accessToken',
    'access-token',
    'authorization',
    'forwardedAuthorization',
    'X-Forwarded-Authorization',
  ];

  const keysToBeMask = R.pipe(
    R.map((sensitiveKey: string) => {
      const caseInsensitiveKeys = getNestedObjectPathsByKey(
        omittedErrInfo,
        sensitiveKey,
      );
      return caseInsensitiveKeys;
    }),
    R.flatten,
  )(sensitiveInfoKeys);

  if (keysToBeMask.length > 0) {
    const hasAxiosError = info['err'] && isAxiosError(info['err']);

    let clonedInfo:
      | winston.Logform.TransformableInfo
      | TransformableInfoWithAxiosError = hasAxiosError
      ? {
          ...(klona(
            R.omit(['err'], info),
          ) as winston.Logform.TransformableInfo),
          err: info['err'],
        }
      : klona(info);

    for (const key of keysToBeMask) {
      clonedInfo = R.assocPath(key.split('.'), '*', clonedInfo);
    }

    return clonedInfo;
  }

  return info;
};

export const maskAuth = winston.format(maskAuthWinstonFormat);

export const transformGCPLogFormatWinstonFormat = (
  info: winston.Logform.TransformableInfo,
  opts: {
    nodeEnv: string;
    gcpProjectId: string;
  },
): winston.Logform.TransformableInfo | boolean => {
  if (opts.nodeEnv === 'development') return info;
  if (!opts.gcpProjectId) throw new Error('Missing GCP Project ID for logger');

  if (!info['loggerMetadata']) {
    return info;
  }

  const clonedInfo =
    info['err'] && isAxiosError(info['err'])
      ? {
          ...(klona(
            R.omit(['err'], info),
          ) as winston.Logform.TransformableInfo),
          err: info['err'],
        }
      : klona(info);

  return {
    ...(R.omit(
      ['loggerMetadata'],
      clonedInfo,
    ) as winston.Logform.TransformableInfo),
    ...R.omit(['traceId', 'spanId'], info['loggerMetadata']),
    message: `${info['loggerMetadata'].functionName}: ${info.message}`,
    severity: info.level.toUpperCase(),
    'logging.googleapis.com/trace': `projects/${opts.gcpProjectId}/traces/${info['loggerMetadata'].traceId}`,
    'logging.googleapis.com/spanId': info['loggerMetadata'].spanId,
    'logging.googleapis.com/operation': `${info['loggerMetadata'].functionName}`,
  };
};

export const transformGCPLogFormat = winston.format(
  transformGCPLogFormatWinstonFormat,
);

export const extractGCPTraceContext = (
  traceContext: string,
): LoggingMetadata => {
  if (!traceContext) return {};

  const [_version, traceId, spanId, _flags] = traceContext.split('-');

  if (traceId && spanId) {
    return {
      traceId,
      spanId,
    };
  }

  return {};
};

export const tryLogAxiosError = (
  err: unknown,
  loggerMetadata: LoggingMetadata,
  logger: winston.Logger,
  extraData?: object,
): void => {
  if (isAxiosError(err)) {
    if (err.config?.url) {
      const [url, params] = err.config?.url.split('?');
      const paramsObj = Object.fromEntries(
        new URLSearchParams(params).entries(),
      );
      logger.error('axios error', {
        ...extraData,
        err: err.toJSON(),
        data: err.response?.data,
        responseStatus: err.response?.status,
        responseHeader: err.response?.headers,
        url,
        queryParams: paramsObj,
        loggerMetadata,
      });
    } else {
      logger.error('axios error', {
        ...extraData,
        err: err.toJSON(),
        data: err.response?.data,
        responseStatus: err.response?.status,
        responseHeader: err.response?.headers,
        loggerMetadata,
      });
    }
  } else {
    logger.error('error', {
      ...extraData,
      err: `${err}`,
      loggerMetadata,
    });
  }
};
