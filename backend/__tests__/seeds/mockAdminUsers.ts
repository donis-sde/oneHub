import { AdminUser } from '@/dataAccess/models/AdminUser';
import { Role } from '@/enums/Role';

// password: Test1234$
export const MOCK_ADMIN_USER_LOGIN_DTO = {
  email: 'test1@clare.ai',
  password: 'Test1234$',
};
export const MOCK_ADMIN_USER = {
  email: 'test1@clare.ai',
  salt: '$2b$10$WWuPz7AUbflraW8OvxXwY.',
  passwordHash: '$2b$10$WWuPz7AUbflraW8OvxXwY.CekvjaUyXKQ8OnLlteCuwez7eQUyVQe',
};
export const MOCK_ADMIN_USER_2 = {
  email: 'test2@clare.ai',
  salt: '$2b$10$WWuPz7AUbflraW8OvxXwY.',
  passwordHash: '$2b$10$WWuPz7AUbflraW8OvxXwY.CekvjaUyXKQ8OnLlteCuwez7eQUyVQe',
};
export const MOCK_ADMIN_USER_3 = {
  email: 'test3@clare.ai',
  salt: '$2b$10$WWuPz7AUbflraW8OvxXwY.',
  passwordHash: '$2b$10$WWuPz7AUbflraW8OvxXwY.CekvjaUyXKQ8OnLlteCuwez7eQUyVQe',
};

export const MOCK_ADMIN_USER_CREATE_DTO_DUPLICATE_INSERTION = {
  email: 'duplicate@clare.ai',
  password: 'duplicate',
};

export const MOCK_ADMIN_USER_CREATE_DTO_CREATE = {
  email: 'create@clare.ai',
  password: 'create',
};

export const MOCK_UNVERIFIED_ADMIN_USER: Omit<AdminUser, '_id'> = {
  email: 'update@clare.ai',
  role: Role.UNVERIFIED,
  salt: 'salt',
  passwordHash: 'passwordHash',
};
