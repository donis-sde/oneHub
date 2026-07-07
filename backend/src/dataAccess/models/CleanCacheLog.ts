/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const cleanCacheLogSchema = new Schema(
  {
    tenantId: { type: String, default: null, required: true },
    loggedInUser: { type: String, default: true, required: true },
    operationTimestamp: { type: Date, default: Date.now, required: true }, // Use Date type for timestamp
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_CLEAN_CACHE_LOG_COLLECTION,
  },
);

export class CleanCacheLog {
  constructor(
    public tenantId: string,
    public loggedInUser: string,
    public operationTimestamp: date,
  ) {}
}

export type CleanCacheLogDto = CleanCacheLog;
