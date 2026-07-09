export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly',
}

export function isLogLevel(v: unknown): v is LogLevel {
  return (
    v === LogLevel.ERROR ||
    v === LogLevel.WARN ||
    v === LogLevel.INFO ||
    v === LogLevel.HTTP ||
    v === LogLevel.VERBOSE ||
    v === LogLevel.DEBUG ||
    v === LogLevel.SILLY
  );
}
