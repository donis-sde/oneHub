import { BackofficePortalLoggingMetadata } from '@/types/LogContext';

declare module 'next' {
  export declare interface NextApiRequest {
    logContext?: BackofficePortalLoggingMetadata;
  }
}
