/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export interface OtherReason {
  Name: string | null;
  Checked: boolean;
  ReasonDetails: string | null;
}

export const otherReasonSchema = new Schema({
  Name: { type: String, default: null },
  Checked: { type: Boolean, default: false },
  ReasonDetails: { type: String, default: null },
});

export const cancelSubscriptionQuestionnaireSchema = new Schema(
  {
    OtherReason: { type: otherReasonSchema, default: null },
    TenantId: { type: String, required: true },
    Created: { type: Date, default: Date.now },
    SubscriptionId: { type: String, default: null },
  },
  { collection: 'CancelSubscriptionQuestionnaire' },
);

export interface CancelSubscriptionQuestionnaire {
  OtherReason: OtherReason | null;
  TenantId: string;
  Created: Date;
  SubscriptionId: string | null;
}

export type CancelSubscriptionQuestionnaireDto =
  CancelSubscriptionQuestionnaire;
