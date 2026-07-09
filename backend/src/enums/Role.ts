export enum Role {
  ADMIN = 'admin',
  ENGINEER = 'engineer',
  OPERATOR = 'operator',
  READONLY = 'readonly',
  UNVERIFIED = 'unverified',
}

export function isRole(v: unknown): v is Role {
  return (
    v === Role.ADMIN ||
    v === Role.ENGINEER ||
    v === Role.OPERATOR ||
    v === Role.READONLY ||
    v === Role.UNVERIFIED
  );
}
