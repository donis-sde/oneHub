/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const getPhoneNumLogSchema = new Schema(
  {
    loggedInUser: { type: String, default: true, required: null },
    operationTimestamp: { type: Date, required: true, default: Date.now },
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_GET_PHONE_NUM_LOG_COLLECTION,
  },
);

export class GetPhoneNumLog {
  constructor(public loggedInUser: string, public operationTimestamp: Date) {}
}

export type GetPhoneNumLogDto = GetPhoneNumLog;
