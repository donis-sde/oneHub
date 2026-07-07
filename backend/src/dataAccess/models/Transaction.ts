/* eslint-disable */
// @ts-nocheck
import { Schema, ObjectId, Document } from 'mongoose';

export interface ITransaction extends Document {
  _id: ObjectId;
  EmailId: string | null;
  Created: Date;
  LastUpdated: Date;
  Currency: string | null;
  InvoiceDate: Date | null;
  InvoiceNumber: string | null;
  InvoiceAmount: number | null;
  TransactionCategory: string | null;
  StripeSubscriptionId: string | null;
  StripeCustomerId: string | null;
  InvoiceStatus: string | null;
  PartnerKey: string | null;
}

export const transactionSchema = new Schema<ITransaction>(
  {
    EmailId: { type: String, default: null, required: true },
    Created: { type: Date, required: true },
    LastUpdated: { type: Date, required: true },
    Currency: { type: String, default: null, required: true },
    InvoiceDate: { type: Date, default: null, required: true },
    InvoiceNumber: { type: String, default: null, required: true },
    InvoiceAmount: { type: Number, default: null, required: true },
    TransactionCategory: { type: String, default: null, required: true },
    StripeSubscriptionId: { type: String, default: null, required: true },
    StripeCustomerId: { type: String, default: null, required: true },
    InvoiceStatus: { type: String, default: null, required: true },
    PartnerKey: { type: String, default: null, required: true },
  },
  {
    collection: 'Transaction',
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

transactionSchema.virtual('id').get(function (this: ITransaction) {
  return this._id.toString();
});

export class Transaction implements ITransaction {
  constructor(
    public _id: ObjectId,
    public EmailId: string | null,
    public Created: Date,
    public LastUpdated: Date,
    public Currency: string | null,
    public InvoiceDate: Date | null,
    public InvoiceNumber: string | null,
    public InvoiceAmount: number | null,
    public TransactionCategory: string | null,
    public StripeSubscriptionId: string | null,
    public StripeCustomerId: string | null,
    public InvoiceStatus: string | null,
    public PartnerKey: string | null,
  ) {}

  get id(): string {
    return this._id.toString();
  }
}

export type TransactionDto = Omit<Transaction, '_id'> & {
  id: string;
};
