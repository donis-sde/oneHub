/* eslint-disable */
// @ts-nocheck
import { mongoMigrateCli } from 'mongo-migrate-ts';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const validateConfig = (): void => {
  if (
    !process.env.DB_URL ||
    !process.env.NEXT_PUBLIC_DB_AUTH_DATABASE ||
    !process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION
  ) {
    console.error('getMigrationConfig:invalid_config');

    throw new Error('invalid_config');
  }
};

validateConfig();

mongoMigrateCli({
  uri: process.env.DB_URL,
  database: process.env.NEXT_PUBLIC_DB_AUTH_DATABASE,
  migrationsDir: 'migrations',
  migrationsCollection: '_migrations',
});
