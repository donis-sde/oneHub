import { isRole, Role } from '@/enums/Role';

export interface AuthJwt {
  role: Role;
  email: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isAuthJwt(v: Record<string, any>): v is AuthJwt {
  return typeof v['role'] === 'string' && typeof v['email'] === 'string';
}
