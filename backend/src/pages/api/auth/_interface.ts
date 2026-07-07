import { AdminUserDto } from '@/dataAccess/models/AdminUser';
import { isBoolean } from 'lodash';

export interface SigninResponse {
  success: boolean;
  metadata?: { adminUser: AdminUserDto };
  error?: string;
}

export function isSigninResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
): obj is SigninResponse {
  return (
    typeof obj === 'object' &&
    !!obj &&
    'success' in obj &&
    isBoolean(obj['success'])
  );
}
