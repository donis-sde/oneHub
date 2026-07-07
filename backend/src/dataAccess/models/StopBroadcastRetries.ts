/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const stopBroadcastLogSchema = new Schema(
  {
    tenantId: { type: String, default: null, required: true },
    broadcastId: { type: String, default: '', required: false },
    slackUrl: { type: String, default: '', required: false },
    type: { type: Number, default: 0, required: true },
    loggedInUser: { type: String, default: true, required: true },
    operationTimestamp: { type: Date, default: Date.now, required: true }, // Use Date type for timestamp
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_STOP_BROADCAST_LOG_COLLECTION,
  },
);

export class StopBroadcastLog {
  constructor(
    public tenantId: string,
    public broadcastId: string,
    public slackUrl: string,
    public type: number,
    public loggedInUser: string,
    public operationTimestamp: date,
  ) {}
}

export type StopBroadcastLogDto = StopBroadcastLog;
