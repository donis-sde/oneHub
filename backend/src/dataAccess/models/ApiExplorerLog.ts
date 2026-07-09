/* eslint-disable */
// @ts-nocheck
import { Schema, model, Document } from 'mongoose';

export interface IApiExplorerLog extends Document {
  method: string;
  url: string;
  requestHeaders: any;
  requestBody: any;
  responseStatus: number;
  responseStatusText: string;
  responseHeaders: any;
  responseData: any;
  responseTime: number;
  responseSize: number;
  error: string | null;
  requestedBy: string;
  timestamp: Date;
  isMetaApi: boolean;
}

export const apiExplorerLogSchema = new Schema<IApiExplorerLog>(
  {
    method: { type: String, required: true },
    url: { type: String, required: true },
    requestHeaders: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
    requestBody: { type: Schema.Types.Mixed, required: false, default: null },
    responseStatus: { type: Number, required: false, default: null },
    responseStatusText: { type: String, required: false, default: null },
    responseHeaders: {
      type: Schema.Types.Mixed,
      required: false,
      default: null,
    },
    responseData: { type: Schema.Types.Mixed, required: false, default: null },
    responseTime: { type: Number, required: false, default: null },
    responseSize: { type: Number, required: false, default: null },
    error: { type: String, required: false, default: null },
    requestedBy: { type: String, required: true },
    isMetaApi: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { autoCreate: true, autoIndex: false, collection: 'ApiExplorerLog' },
);

export class ApiExplorerLog {
  constructor(
    public method: string,
    public url: string,
    public requestHeaders: any,
    public requestBody: any,
    public responseStatus: number,
    public responseStatusText: string,
    public responseHeaders: any,
    public responseData: any,
    public responseTime: number,
    public responseSize: number,
    public error: string | null,
    public requestedBy: string,
    public isMetaApi: boolean,
    public timestamp: Date,
  ) {}
}

export type ApiExplorerLogDto = ApiExplorerLog;
