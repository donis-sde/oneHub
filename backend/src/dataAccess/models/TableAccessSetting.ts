/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const tableAccessSettingSchema = new Schema(
  {
    tableName: { type: String, default: null, require: true },
    userId: { type: String, default: null, require: true },
    defaultPreview: { type: Boolean, default: true, require: true },
    settingType: { type: String, default: 1, require: true },
  },
  {
    collection: process.env.NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
  },
);

export class TableAccessSetting {
  constructor(
    public tableName: string,
    public userId: string,
    public defaultPreview: boolean,
    public settingType: string,
  ) {}
}

export type TableAccessSettingDto = TableAccessSetting;
