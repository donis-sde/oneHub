/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const getBmidLogSchema = new Schema(
  {
    loggedInUser: { type: String, default: true, required: null },
    operationTimestamp: { type: Date, required: true, default: Date.now }, // Use Date type for timestamp
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_GET_BMID_LOG_COLLECTION,
  },
);

export class GetBmidLog {
  constructor(public loggedInUser: string, public operationTimestamp: Date) {}
}

export type GetBmidLogDto = GetBmidLog;
