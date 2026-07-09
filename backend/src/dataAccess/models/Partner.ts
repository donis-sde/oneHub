/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const partnerSchema = new Schema(
  {
    CustomerId: { type: String, default: null, require: true },
    Created: { type: Date, require: true },
    LastUpdated: { type: Date, require: true },
    FirstName: { type: String, default: null, require: true },
    LastName: { type: String, default: null, require: true },
    Email: { type: String, default: null, require: true },
    Phone: { type: String, default: null, require: true },
    Company: { type: String, default: null, require: true },
    PartnerKey: { type: String, default: null, require: true },
    JoinedDate: { type: Date, default: null },
    Domain: { type: String },
    EmailDomain: { type: String },
    RegisterEmail: [{ type: String }],
    PartnerAdminEmail: [{ type: String }],
    FBEmbeddedSignupSolutionId: { type: String },
    DefaultLogo: { type: String },
    DefaultVisibility: {
      Billing: { type: Boolean, default: false },
      Integration: { type: Boolean, default: false },
      APIDoc: { type: Boolean, default: false },
      ZohoChat: { type: Boolean, default: false },
      Tutorial: { type: Boolean, default: false },
    },
    DefaultTemplateFooter: { type: String },
    WhiteLabel: { type: Boolean, default: false },
  },
  { collection: 'Partner' },
);

export class Partner {
  constructor(
    public Created: Date,
    public LastUpdated: Date,
    public JoinedDate: Date,
    public FirstName: string | null,
    public LastName: string | null,
    public Email: string | null,
    public Phone: string | null,
    public Company: string | null,
    public CustomerId: string | null,
    public PartnerKey: string | null,
    public Domain?: string,
    public EmailDomain?: string,
    public RegisterEmail?: string[],
    public PartnerAdminEmail?: string[],
    public FBEmbeddedSignupSolutionId?: string,
    public DefaultLogo?: string,
    public DefaultVisibility?: {
      Billing: boolean;
      Integration: boolean;
      APIDoc: boolean;
      ZohoChat: boolean;
      Tutorial: boolean;
    },
    public DefaultTemplateFooter?: string,
    public WhiteLabel?: boolean,
  ) {}
}

export type PartnerDto = Partner;
