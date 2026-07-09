/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const columnAccessSettingSchema = new Schema(
  {
    tableId: {
      type: Schema.Types.ObjectId,
      ref: 'TableAccessSetting',
      require: true,
      default: null,
    },
    columnName: { type: String, default: null, require: true },
    visible: { type: Boolean, default: true, require: true },
    sortOrder: { type: Number, default: 0, require: true },
  },
  {
    collection:
      process.env.NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
  },
);

export class ColumnAccessSetting {
  constructor(
    public tableId: Schema.Types.ObjectId,
    public columnName: String,
    public visible: boolean,
    public sortOrder: number,
  ) {}
}

export type ColumnAccessSettingDto = ColumnAccessSetting;
