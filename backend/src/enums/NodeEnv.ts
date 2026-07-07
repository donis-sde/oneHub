export enum NodeEnv {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export function isNodeEnv(v: unknown): v is NodeEnv {
  return (
    v === NodeEnv.PRODUCTION ||
    v === NodeEnv.STAGING ||
    v === NodeEnv.DEVELOPMENT ||
    v === NodeEnv.TEST
  );
}
