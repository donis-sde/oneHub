/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const regPhoneNumLogSchema = new Schema(
  {
    loggedInUser: { type: String, default: true, required: null },
    operationTimestamp: { type: Date, required: true, default: Date.now },
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_REG_PHONE_NUM_LOG_COLLECTION,
  },
);

export class RegPhoneNumLog {
  constructor(public loggedInUser: string, public operationTimestamp: Date) {}
}

export type RegPhoneNumLogDto = RegPhoneNumLog;
