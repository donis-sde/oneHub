import { Schema } from 'mongoose';

export const creditCustomerSchema = new Schema(
  {
    FirstName: { type: String },
    LastName: { type: String },
    Email: { type: String },
    Phone: { type: String },
    IsTrial: { type: Boolean },
    Domain: { type: String },
    StripeCustomerId: { type: String },
    StripeSubscriptionId: { type: String },
    Credit: { type: Number },
    IsAutoChargeEnabled: { type: Boolean },
    RechargeAmount: { type: Number },
    LowBalance: { type: Number },
    PaymentType: { type: String },
    Currency: { type: String },
    WelcomeCredit: { type: Number },
  },
  { collection: 'CreditCustomer' },
);

export class CreditCustomer {
  constructor(
    public FirstName: string,
    public LastName: string,
    public Email: string,
    public Phone: string,
    public IsTrial: boolean,
    public Domain: string,
    public StripeCustomerId: string,
    public StripeSubscriptionId: string,
    public Credit: number,
    public IsAutoChargeEnabled: boolean,
    public RechargeAmount: number,
    public LowBalance: number,
    public PaymentType: string,
    public Currency: string,
    public WelcomeCredit: number,
  ) {}
}
