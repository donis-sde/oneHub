/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export enum ChargeType {
  ONETIME_CHARGE = 'ONETIME_CHARGE',
  AUTO_RECHARGE = 'AUTO_RECHARGE',
}

export enum ConfirmStatus {
  HOSTED_PAGE_CREATED = 'HOSTED_PAGE_CREATED',
  INVOICE_CONFIRMED = 'INVOICE_CONFIRMED',
  HOSTED_PAGE_EXPIRED = 'HOSTED_PAGE_EXPIRED',
  HOSTED_PAGE_NOT_FOUND = 'HOSTED_PAGE_NOT_FOUND',
}

export const creditEventLogSchema = new Schema(
  {
    InvoiceId: { type: String, default: null },
    HostedPageId: { type: String, default: null },
    CreditCustomerId: { type: String, default: null },
    SubscriptionId: { type: String, default: null },
    CustomerId: { type: String, default: null },
    InvoiceStatus: { type: String, default: null },
    InvoiceStatusChargebee: { type: String, default: null },
    Amount: { type: Number, default: 0 },
    ChargeType: {
      type: String,
      enum: Object.values(ChargeType),
      default: ChargeType.ONETIME_CHARGE,
    },
    CreatedAt: { type: Date, default: Date.now },
    UpdatedAt: { type: Date, default: Date.now },
    ConfirmStatus: {
      type: String,
      enum: Object.values(ConfirmStatus),
      default: ConfirmStatus.HOSTED_PAGE_CREATED,
    },
    Currency: { type: String, default: 'USD' },
  },
  { collection: 'CreditEventLog' },
);

export interface CreditEventLog {
  InvoiceId: string | null;
  HostedPageId: string | null;
  CreditCustomerId: string | null;
  SubscriptionId: string | null;
  CustomerId: string | null;
  InvoiceStatus: string | null;
  InvoiceStatusChargebee: string | null;
  Amount: number;
  ChargeType: ChargeType;
  CreatedAt: Date;
  UpdatedAt: Date;
  ConfirmStatus: ConfirmStatus;
  Currency: string;
}

export type CreditEventLogDto = CreditEventLog;
