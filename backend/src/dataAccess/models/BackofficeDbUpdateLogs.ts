/* eslint-disable */
// @ts-nocheck
import { Schema, model, Document } from 'mongoose';

export interface IBackofficeDbUpdateLogs extends Document {
  collectionName: string;
  oldValue: any;
  impactedRecordObjectId: string;
  tenantId: string | null;
  impactedRecordEmail: string | null;
  dbName: string;
  changedBy: string;
  fieldChanged: string;
  newValue: any;
  timestamp: Date;
  filterUsed: any;
}

export const backofficeDbUpdateLogsSchema = new Schema<IBackofficeDbUpdateLogs>(
  {
    collectionName: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed, required: true },
    impactedRecordObjectId: { type: String, required: true },
    tenantId: { type: String, required: true, default: null },
    impactedRecordEmail: { type: String, required: true, default: null },
    dbName: { type: String, required: true },
    fieldChanged: { type: String, required: true },
    changedBy: { type: String, required: true },
    newValue: { type: Schema.Types.Mixed, required: true },
    filterUsed: { type: Schema.Types.Mixed, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { autoCreate: true, autoIndex: false, collection: 'BackofficeDbUpdateLogs' },
);

export class BackofficeDbUpdateLogs {
  constructor(
    public collectionName: string,
    public oldValue: any,
    public impactedRecordObjectId: string,
    public tenantId: string | null,
    public impactedRecordEmail: string | null,
    public dbName: string,
    public changedBy: string,
    public fieldChanged: string,
    public newValue: any,
    public filterUsed: any,
    public timestamp: Date,
  ) {}
}

export type BackofficeDbUpdateLogsDto = BackofficeDbUpdateLogs;
