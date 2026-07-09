import { Schema } from 'mongoose';

export const someMapSchema = new Schema(
  {
    someNumber: { type: Number },
    someString: { type: String },
  },
  { autoCreate: false, autoIndex: false },
);

export const adminUserSchema = new Schema(
  {
    email: { type: String, required: true },
    role: {
      required: true,
      type: String,
    },
    salt: { type: String },
    passwordHash: { type: String },
    someMap: { type: someMapSchema, default: {} },
    someArray: { type: [String] },
    someArray2: { type: [Number] },
  },
  { autoCreate: false, autoIndex: false, collection: 'adminUsers' },
);

export class SomeMap {
  constructor(public someNumber: number, public someString: string) {}
}

export class AdminUser {
  constructor(
    public email: string,
    public role: string,
    public salt: string,
    public passwordHash?: string,
    public someMap?: SomeMap,
    public someArray?: string[],
    public someArray2?: number[],
  ) {}
}

export interface AdminUserQueryDto {
  email: string;
  password: string;
}

export function isAdminUserQueryDto(v: unknown): v is AdminUserQueryDto {
  return (
    typeof v === 'object' &&
    !!v &&
    'email' in v &&
    'password' in v &&
    typeof v.email === 'string' &&
    typeof v.password === 'string'
  );
}

export type AdminUserDto = Omit<AdminUser, 'passwordHash' | 'salt'>;
