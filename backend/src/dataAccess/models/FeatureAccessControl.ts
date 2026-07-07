/* eslint-disable */
// @ts-nocheck
import { Schema, model, Document, Mixed } from 'mongoose';
// import { Role } from '@/enums/Role';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

export interface IFeatureAccessControl extends Document {
  role: String;
  features: {
    featureName: BackofficeFeature;
    permissions: ('read' | 'write' | 'use')[];
  }[];
}

export const featureAccessControlSchema = new Schema<IFeatureAccessControl>(
  {
    role: {
      type: String,
      required: true,
      unique: true,
    },
    features: [
      {
        _id: false,
        featureName: {
          type: String,
          enum: Object.values(BackofficeFeature),
          required: true,
        },
        permissions: {
          type: [String],
          enum: ['read', 'write'],
          required: true,
        },
      },
    ],
  },
  {
    autoCreate: true,
    autoIndex: true,
    collection: 'FeatureAccessControl',
  },
);

export class FeatureAccessControl {
  constructor(
    public features: {
      featureName: BackofficeFeature;
      permissions: ('read' | 'write')[];
    }[],
    public role: string,
  ) {}
}

export type FeatureAccessControlDto = FeatureAccessControl;
