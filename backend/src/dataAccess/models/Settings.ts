/* eslint-disable */
// @ts-nocheck
import { Schema } from 'mongoose';

export const settingsSchema = new Schema(
  {
    TenantId: { type: String, default: null, require: true },
    WhatsappSetting: { type: Schema.Types.Mixed, default: null },
    EnvironmentName: { type: String, default: null },
    PlanTier: { type: String, default: null },
    GeneralSetting: {
      type: Schema.Types.Mixed,
      default: null,
      require: true,
    },
    WABAStatus: { type: String, default: null },
    WABAQualityRating: { type: String, default: null },
    FeatureSetting: { type: Array, default: [] },
    WhiteListIps: { type: Array, default: [] },
    AutoDeletionSettings: { type: Schema.Types.Mixed, default: null },
    FlowBuilderSettings: { type: Schema.Types.Mixed, default: null },
    IsShopifyTemplateRegistered: { type: Boolean, default: false },
    IsWoocommerceTemplateRegistered: { type: Boolean, default: false },
    IsWABAPhoneRegistered: { type: Boolean, default: false },
    CreditSettings: { type: Schema.Types.Mixed, default: null },
    IsAccountStatusPageEnabled: { type: Boolean, default: true },
    WhatsAppPayment: { type: Schema.Types.Mixed, default: null },
    CatalogPaymentSettings: { type: Schema.Types.Mixed, default: null },
    ShopifyCatalogSettings: { type: Schema.Types.Mixed, default: null },
    IsInvitePopupSkipped: { type: Boolean, default: true },
    IsWelcomeINRModalShown: { type: Boolean, default: false },
    DisableWebhook: { type: Boolean, default: false },
    DisableRecurringJob: { type: Boolean, default: false },
    DisableAPIAccess: { type: Boolean, default: false },
    IsDeleted: { type: Boolean, default: true },
    DeletedAt: { type: Date, default: null },
    IsPaidFullTrial: { type: Boolean, default: true },
    FullTrialBecomePaidAt: { type: Date, default: null },
  },
  { collection: 'Settings' },
);

export interface GeneralSettings {
  WhatsappServer: string | null;
  WhatsappCredential: string | null;
  LoginUrl: string;
  ResetPasswordUrl: string;
  WABusinessAccountId: string;
  WABusinessAccountToken: string;
  WANamespace: string;
  MaxNumberOperators: number;
  ClareMessageServerApi: string;
  ClareMessageServerAppId: string;
  CustomerDailyReportEmail: string;
  ReportSettings: any;
  CustomerTimeZone: string;
  FrontEndUrl: string;
  Language: string;
  StripeCustomerId: string;
  StripeSubscriptionId: string;
  BillingModuleVisibility: boolean;
  OverdueInvoiceReminders: boolean;
  AllowBuyCredits: boolean;
  BillingType: string;
  PaymentType: string;
  TwilioAccountSid: string;
  TwilioAuthToken: string;
  TwilioNumber: string;
  TwilioSmsWebhookUrl: string | null;
  MaxKeywordsCount: number;
  AllowedFlowNodesCount: number;
  MaxFlows: number;
  MaxGroups: number;
  MaxWebhooks: number;
  MaxTeams: number;
  SmsEnabled: boolean;
  SupportButtonEnabled: boolean;
  ContentDirection: number;
  WhatsappApiType: number;
  CloudApiPhoneNumberId: string;
  CloudApiFacebookSystemUserToken: string;
  IsOfflineModeEnabled: boolean;
  HasOfflineModeFlagBeenInitiatedByConfig: boolean;
  IsCustomLogoExist: boolean;
  PhoneNumber: string;
  IsSubscriptionAutoCancellationEnabled: boolean;
  IsPricingPlanFeatureEnabled: boolean;
  IsCustomGraphApiDomainEnabled: boolean;
  CustomGraphApiDomain: string | null;
  DefaultTemplateFooterContent: string;
  BroadcastRateLimit: number;
  IsMigratedFromTrial: boolean;
  FullTrialExpirationAt: Date | null;
  IntegrationVisibility: boolean;
  APIDocVisibility: boolean;
  ZohoChatVisibility: boolean;
  TutorialVisibility: boolean | null;
  IsBroadcastAlwaysExcludeInvalidContact: boolean | null;
  PartnerId: string | null;
  FBEmbeddedSignupSolutionId: string | null;
  IsWhitelabel: boolean | null;
}

export interface FeatureSetting {
  Feature: string;
  Checked: boolean;
}

export interface CreditSettings {
  UpdatedAt: Date;
  LowerCredit: boolean;
}

export interface CatalogPaymentSettings {
  IsCatalogPaymentEnabled: boolean;
  IsAutoCheckoutEnabled: boolean;
  IsWhatsAppPayEnabled: boolean;
  AddressBodyText: string;
  PaymentBodyText: string;
  PaymentFooterText: string;
  PaymentMethodName: string | null;
}

export interface ShopifyCatalogSettings {
  IsEnabled: boolean;
  TemplateMessageId: string;
  TagNameForCatalogOrder: string;
}

export class Settings {
  TenantId: string | null;
  WhatsappSetting: any;
  EnvironmentName: string | null;
  PlanTier: string | null;
  GeneralSetting: GeneralSettings | null;
  WABAStatus: string | null;
  WABAQualityRating: string | null;
  FeatureSetting: FeatureSetting[] | null;
  WhiteListIps: string[] | null;
  AutoDeletionSettings: any | null;
  FlowBuilderSettings: any | null;
  IsShopifyTemplateRegistered: boolean | null;
  IsWoocommerceTemplateRegistered: boolean | null;
  IsWABAPhoneRegistered: boolean | null;
  CreditSettings: CreditSettings | null;
  IsAccountStatusPageEnabled: boolean | null;
  WhatsAppPayment: any;
  CatalogPaymentSettings: CatalogPaymentSettings | null;
  ShopifyCatalogSettings: ShopifyCatalogSettings | null;
  IsInvitePopupSkipped: boolean | null;
  IsWelcomeINRModalShown: boolean | null;
  DisableWebhook: boolean | null;
  DisableRecurringJob: boolean | null;
  DisableAPIAccess: boolean | null;
  IsDeleted: boolean | null;
  DeletedAt: Date | null;
  IsPaidFullTrial: boolean | null;
  FullTrialBecomePaidAt: Date | null;
  GeneralSetting: {
    WABusinessAccountId: string | null;
  } | null;
  GeneralSetting: {
    StripeSubscriptionId: string | null;
  } | null;
  GeneralSetting: {
    StripeCustomerId: string | null;
  } | null;
}

export type SettingsDto = Settings;
