import { Schema } from 'mongoose';

export const onboardingFixLogSchema = new Schema(
  {
    subscriptionId: { type: String, default: null, required: true },
    tenantId: { type: String, default: null },
    loggedInUser: { type: String, default: null, required: true },
    success: { type: Boolean, default: false, required: true },
    stepsCompleted: { type: Number, default: 0 },
    failedAtStep: { type: String, default: null },
    message: { type: String, default: null },
    operationTimestamp: { type: Date, default: Date.now, required: true },
  },
  {
    collection: 'OnboardingFixLog',
  },
);

export class OnboardingFixLog {
  constructor(
    public subscriptionId: string,
    public tenantId: string | null,
    public loggedInUser: string,
    public success: boolean,
    public stepsCompleted: number,
    public failedAtStep: string | null,
    public message: string,
    public operationTimestamp: Date,
  ) {}
}

export type OnboardingFixLogDto = OnboardingFixLog;
