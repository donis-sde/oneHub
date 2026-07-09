/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

// Main contact activity log schema
export const terminateSubscriptionLogSchema = new Schema(
  {
    tenantId: { type: String, default: null, required: true },
    tenantFirstName: { type: String, default: null },
    watiInitial: { type: String, default: null },
    reason: { type: String, default: null },
    operationType: { type: String, default: null, required: true },
    operationResult: { type: String, default: null, required: true },
    isSuccess: { type: Boolean, default: null, required: true },
    loggedInUser: { type: String, default: true, required: true },
    operationTimestamp: { type: Date, default: Date.now, required: true }, // Use Date type for timestamp
  },
  {
    collection:
      process.env.NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION,
  },
);

export class TerminateSubscriptionLog {
  constructor(
    public tenantId: string,
    public tenantFirstName: string,
    public watiInitial: string,
    public reason: string,
    public operationType: string,
    public operationResult: string,
    public isSuccess: boolean,
    public loggedInUser: string,
    public operationTimestamp: date,
  ) {}
}

export type TerminateSubscriptionLogDto = TerminateSubscriptionLog;
