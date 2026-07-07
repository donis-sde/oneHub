import { Schema } from 'mongoose';

export const cloudApiSetupProcessSchema = new Schema(
  {
    TenantId: { type: String, default: null },
    BMID: { type: String, default: null },
    WABAID: { type: String, default: null },
    WADisplayName: { type: String, default: null },
    WABAPhoneId: { type: String, default: null },
    WABAPhoneNumber: { type: String, default: null },
    Created: { type: Date },
    LastUpdated: { type: Date },
  },
  { collection: 'CloudApiSetupProcess', strict: false },
);

export class CloudApiSetupProcess {
  constructor(
    public TenantId: string | null,
    public BMID: string | null,
    public WABAID: string | null,
    public WADisplayName: string | null,
    public WABAPhoneId: string | null,
    public WABAPhoneNumber: string | null,
    public Created: Date,
    public LastUpdated: Date,
  ) {}
}

export type CloudApiSetupProcessDto = CloudApiSetupProcess;
