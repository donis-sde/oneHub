import { allPaymentType, PaymentType } from '@/enums/PaymentType';
import {
  allTenantClientType,
  TenantClientType,
} from '@/enums/TenantClientType';
import { allTenantStates, TenantState } from '@/enums/TenantState';
import {
  allWAVerificationStatus,
  WAVerificationStatus,
} from '@/enums/WAVerificationStatus';
import { Schema } from 'mongoose';

export const retryCountSchema = new Schema({
  CreateWhatsapp: { type: Number, require: true },
  CreateWATI: { type: Number, require: true },
  RegisterGateway: { type: Number, require: true },
  UpdateConfigWATI: { type: Number, require: true },
});
class RetryCount {
  CreateWhatsapp: number;
  CreateWATI: number;
  RegisterGateway: number;
  UpdateConfigWATI: number;

  constructor(
    CreateWhatsapp: number,
    CreateWATI: number,
    RegisterGateway: number,
    UpdateConfigWATI: number,
  ) {
    this.CreateWhatsapp = CreateWhatsapp;
    this.CreateWATI = CreateWATI;
    this.RegisterGateway = RegisterGateway;
    this.UpdateConfigWATI = UpdateConfigWATI;
  }
}

export const waPhoneNumberSchema = new Schema(
  {
    id: { type: String, require: true },
    display_phone_number: { type: String, require: true },
    certificate: { type: String, require: true },
    pin: { type: String, require: true },
  },
  { _id: false },
);

class WAPhoneNumber {
  id: string;
  display_phone_number: string;
  certificate: string;
  pin: string;

  constructor(
    id: string,
    display_phone_number: string,
    certificate: string,
    pin: string,
  ) {
    this.id = id;
    this.display_phone_number = display_phone_number;
    this.certificate = certificate;
    this.pin = pin;
  }
}

export const tenantSchema = new Schema(
  {
    TenantId: { type: String, default: null, require: true },
    BackendDomain: { type: String, default: null, require: true },
    DbName: { type: String, default: null, require: false },
    ConnectionString: { type: String, default: null, require: false },
    StripeCustomerId: { type: String, default: null, require: true },
    FrontEndUrl: { type: String, default: null, require: true },
    StripeSubscriptionId: { type: String, default: null, require: true },
    WATIProduct: {
      type: String,
      default: null,
      require: true,
      enum: ['Gateway', 'WATI'],
    },
    WATIAdminPassword: { type: String, default: null, require: true },
    WADisplayName: { type: String, default: null, require: true },
    WABAID: { type: String, default: null, require: true },
    WAGatewayUrl: { type: String, default: null, require: true },
    WAGatewayAdminPassword: { type: String, default: null, require: true },
    WAConnectionType: {
      type: String,
      default: null,
      require: true,
      enum: ['REST'],
    },
    WAVerificationStatus: {
      type: String,
      require: true,
      enum: allWAVerificationStatus,
    },
    WAVerified: {
      type: String,
      default: null,
      require: true,
      enum: ['VERIFIED'],
    },
    WAVerifiedDate: { type: String, default: null, require: true },
    WACertificate: { type: String, default: null, require: true },
    Created: { type: Date, require: true },
    LastUpdated: { type: Date, require: true },
    State: {
      type: String,
      default: null,
      require: true,
      enum: allTenantStates,
    },
    Note: { type: String, default: null, require: true },
    ClientType: {
      type: String,
      default: null,
      require: true,
      enum: allTenantClientType,
    },
    ClientFirstName: { type: String, default: null, require: true },
    ClientLastName: { type: String, default: null, require: true },
    ClientEmail: { type: String, default: null, require: true },
    ClientPhone: { type: String, default: null, require: true },
    ClientCompanyName: { type: String, default: null, require: true },
    WABAPhoneInfo: { type: waPhoneNumberSchema, default: null },
    PaymentType: {
      type: String,
      default: null,
      require: true,
      enum: allPaymentType,
    },
    RetryAfter: { type: Date, default: null },
    RetryCount: { type: retryCountSchema, default: null },
    CustomSubDomain: { type: Boolean },
    GreenTickApplication: { type: Boolean },
    ProPlan: { type: Boolean },
    MaxNumberOperators: { type: Number },
    BMID: { type: String },
    HubSpotAdded: { type: Boolean },
    GatewayType: { type: String, default: null },
  },
  { collection: 'Tenant' },
);
export class Tenant {
  constructor(
    public TenantId: string | null,
    public BackendDomain: string | null,
    public DbName: string | null,
    public ConnectionString: string | null,
    public StripeCustomerId: string | null,
    public FrontEndUrl: string | null,
    public StripeSubscriptionId: string | null,
    public WATIProduct: 'Gateway' | 'WATI' | null,
    public WATIAdminPassword: string | null,
    public WADisplayName: string | null,
    public WABAID: string | null,
    public WAGatewayUrl: string | null,
    public WAGatewayAdminPassword: string | null,
    public WAConnectionType: 'REST' | null,
    public WAVerificationStatus: WAVerificationStatus,
    public WAVerified: 'VERIFIED' | null,
    public WAVerifiedDate: string | null,
    public WACertificate: string | null,
    public Created: Date,
    public LastUpdated: Date,
    public State: TenantState | null,
    public Note: string | null,
    public ClientType: TenantClientType | null,
    public ClientFirstName: string | null,
    public ClientLastName: string | null,
    public ClientEmail: string | null,
    public ClientPhone: string | null,
    public ClientCompanyName: string | null,
    public WABAPhoneInfo: WAPhoneNumber | null,
    public PaymentType: PaymentType | null,
    public RetryAfter: Date | null,
    public RetryCount: RetryCount | null,
    public CustomSubDomain: boolean,
    public GreenTickApplication: boolean,
    public ProPlan: boolean,
    public MaxNumberOperators: number,
    public BMID: string,
    public HubSpotAdded: boolean,
    public GatewayType: string | null,
  ) {}
}

export type TenantDto = Tenant;
