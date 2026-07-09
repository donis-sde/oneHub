/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

// Define the schema for operation counts
const operationCountsSchema = new Schema({
  totalCount: { type: Number, required: true },
  deletedCount: { type: Number, required: true },
  notDeletedCount: { type: Number, required: true },
});

const operationFilterSchema = new Schema({
  startDate: { type: Date, required: false },
  endDate: { type: Date, required: false },
});

// Main contact activity log schema
export const contactActivityLogSchema = new Schema(
  {
    tenantId: { type: String, default: null, required: true },
    tenantFirstName: { type: String, default: null },
    operationType: { type: String, default: 1, required: true },
    operationOption: { type: String, default: 1, required: true },
    operationFilters: { type: operationFilterSchema, required: true },
    loggedInUser: { type: String, default: true, required: true },

    // Embed the operationCountsSchema for before and after operation counts
    beforeOperationCounts: { type: operationCountsSchema, required: true },
    afterOperationCounts: { type: operationCountsSchema, required: true },

    operationTimestamp: { type: Date, default: Date.now, required: true }, // Use Date type for timestamp
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_CONTACT_ACTIVITY_LOG_COLLECTION,
  },
);

export class ContactActivityLog {
  constructor(
    public tenantId: string,
    public tenantFirstName: string,
    public operationType: string,
    public operationOption: string,
    public operationFilters: {
      startDate?: Date;
      endDate?: Date;
    },
    public loggedInUser: string,

    public beforeOperationCounts: {
      totalCount: number;
      deletedCount: number;
      notDeletedCount: number;
    },
    public afterOperationCounts: {
      totalCount: number;
      deletedCount: number;
      notDeletedCount: number;
    },

    public operationTimestamp: date,
  ) {}
}

export type ContactActivityLogDto = ContactActivityLog;
