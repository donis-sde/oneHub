import { AxiosError } from 'axios';
import * as winston from 'winston';

export interface UserContext {
  email: string;
  role: string;
}

export interface LogContext {
  requestId?: string;
  userContext?: UserContext;
}

export interface TransformableInfoWithAxiosError
  extends winston.Logform.TransformableInfo {
  err: AxiosError;
}

export interface LoggingMetadata {
  traceId?: string;
  spanId?: string;
}

export interface BackofficePortalLoggingMetadata extends LoggingMetadata {
  functionName?: string;
  API?: string;

  userContext?: UserContext;
}
