import { Schema } from 'mongoose';

export const watiStatesSchema = new Schema(
  {
    phone_id: { type: String },
    account_mode: { type: String },
    code_verification_status: { type: String },
    display_phone_number: { type: String },
    messaging_limit_tier: { type: String },
    name_status: { type: String },
    new_name_status: { type: String },
    quallity_score: { type: String },
    search_visibility: { type: String },
    status: { type: String },
    verified_name: { type: String },
    wabba_id: { type: String },
    account_review_status: { type: String },
    business_verification_status: { type: String },
    waba_update: { type: String },
    quality_rating: { type: String },
  },
  { collection: 'WatiStates' },
);

export class WatiStates {
  constructor(
    public phone_id: string,
    public account_mode: string,
    public code_verification_status: string,
    public display_phone_number: string,
    public messaging_limit_tier: string,
    public name_status: string,
    public new_name_status: string,
    public quallity_score: string,
    public search_visibility: string,
    public status: string,
    public verified_name: string,
    public wabba_id: string,
    public account_review_status: string,
    public business_verification_status: string,
    public waba_update: string,
    public quality_rating: string,
  ) {}
}
