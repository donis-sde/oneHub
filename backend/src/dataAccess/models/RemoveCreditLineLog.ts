/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const removeCreditLineLogSchema = new Schema(
  {
    loggedInUser: { type: String, default: true, required: null },
    operationTimestamp: { type: Date, required: true, default: Date.now },
  },
  {
    collection:
      process.env.NEXT_PUBLIC_DB_AUTH_REMOVE_CREDIT_LINE_LOG_COLLECTION,
  },
);

export class RemoveCreditLineLog {
  constructor(public loggedInUser: string, public operationTimestamp: Date) {}
}

export type RemoveCreditLineLogDto = RemoveCreditLineLog;
