/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

// Main contact activity log schema
export const createUserLogSchema = new Schema(
  {
    tenantId: { type: String, default: null, required: true },
    tenantFirstName: { type: String, default: null },
    email: { type: String, default: null },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    passwordType: { type: Number, default: 1, default: null },
    plainTextPassword: { type: String, default: null },
    operationType: { type: Number, default: 1, required: true },
    loggedInUser: { type: String, default: true, required: true },
    operationTimestamp: { type: Date, default: Date.now, required: true }, // Use Date type for timestamp
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION,
  },
);

export class CreateUserLog {
  constructor(
    public tenantId: string,
    public tenantFirstName: string,
    public email: string,
    public firstName: string,
    public lastName: string,
    public passwordType: number,
    public plainTextPassword: string,
    public operationType: number,
    public loggedInUser: string,
    public operationTimestamp: date,
  ) {}
}

export type CreateUserLogDto = CreateUserLog;
