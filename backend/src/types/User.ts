import { keyIn } from '@/utils/validationUtil';
import { isString } from 'lodash';

export interface AdminUserDto {
  email: string;
  role: string;
}

export function isAdminUserDto(result: unknown): result is AdminUserDto {
  return (
    keyIn('email', result) &&
    isString(result.email) &&
    keyIn('role', result) &&
    isString(result.role)
  );
}
