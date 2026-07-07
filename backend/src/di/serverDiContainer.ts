/* eslint-disable */
// @ts-nocheck
import { AdminUserDao } from '@/dataAccess/AdminUserDao';
import { PartnerDao } from '@/dataAccess/PartnerDao';
import { SettingsDao } from '@/dataAccess/SettingsDao';
import { TenantDao } from '@/dataAccess/TenantDao';
import { BackofficeDbUpdateLogsDao } from '@/dataAccess/BackofficeDbUpdateLogsDao';
import { CreateUserLogDao } from '@/dataAccess/CreateUserLogDao';
import { TerminateSubscriptionLogDao } from '@/dataAccess/TerminateSubscriptionLogDao';
import { FeatureAccessControlDao } from '@/dataAccess/FeatureAccessControlDao';
import { isLogLevel } from '@/enums/LogLevel';
import { getEnv } from '@/utils/getEnv';
import { maskAuth, transformGCPLogFormat } from '@/utils/loggingUtils';
import mongoose, { Connection } from 'mongoose';
import winston from 'winston';
import setEnv from '../../setEnv';
import { ColumnSettingDao } from '@/dataAccess/ColumnSettingDao';
import { TableSettingDao } from '@/dataAccess/TableSettingDao';
import { WatiStatesDao } from '@/dataAccess/WatiStatesDao';
import { CreditCustomerDao } from '@/dataAccess/CreditCustomerDao';
import { MongoClient } from 'mongodb';
import { CleanCacheLogDao } from '@/dataAccess/CleanCacheLogDao';
import { PrmGatewayDao } from '@/dataAccess/PrmGatewayDao';
import { StopBroadcastRetriesDao } from '@/dataAccess/StopBroadcastRetriesDao';
import { ApiExplorerLogDao } from '@/dataAccess/ApiExplorerLogDao';
import mysql from 'mysql2/promise';
import { createPool } from 'mysql2/promise';
import { GetBmidLogDao } from '@/dataAccess/GetBmidLogDao';
import { GetPhoneNumLogDao } from '@/dataAccess/GetPhoneNumLogDao';
import { GetOtpLogDao } from '@/dataAccess/GetOtpLogDao';
import { RegPhoneNumLogDao } from '@/dataAccess/RegPhoneNumLogDao';
import { RemoveCreditLineLogDao } from '@/dataAccess/RemoveCreditLineLogDao';
import { CancelSubscriptionQuestionnaireDao } from '@/dataAccess/CancelSubscriptionQuestionnaireDao';
import { CreditEventLogDao } from '@/dataAccess/CreditEventLogDao';
import { CloudApiSetupProcessDao } from '@/dataAccess/CloudApiSetupProcessDao';
import { OnboardingFixLogDao } from '@/dataAccess/OnboardingFixLogDao';

export enum Token {
  ADMIN_USER_MONGOOSE_CONNECTION = 'adminUserMongooseConnection',
  TENANTS_MONGOOSE_CONNECTION = 'tenantsMongooseConnection',
  TENANT_DAO = 'tenantDao',
  ADMIN_USER_DAO = 'adminUserDao',
  PARTNER_DAO = 'partnerDao',
  SETTINGS_DAO = 'settingsDao',
  LOGGER = 'logger',
  BACKOFFICE_DB_UPDATE_LOGS_DAO = 'backofficeDbUpdateLogsDao',
  CREATE_USER_LOG_DAO = 'createUserLogDao',
  TERMINATE_SUBSCRIPTION_LOG_DAO = 'terminateSubscriptionLogDao',
  FEATURE_ACCESS_CONTROL_DAO = 'featureAccessControlDao',
  ADMIN_USER_TABLE_ACCESS_SETTING_DAO = 'tableSettingDao',
  ADMIN_USER_COLUMN_ACCESS_SETTING_DAO = 'columnSettingDao',
  WATI_STATES_DAO = 'watiStatesDao',
  CREDIT_CUSTOMER_DAO = 'creditCustomerDao',
  WEBHOOK_EVENT_WABA_COLLECTION = 'webhookEventWabaCollection',
  WATI_ROUTE_COLLECTION = 'watiRouteCollection',
  REGISTER_CLOUD_API_AUDIT_LOG_COLLECTION = 'registerCloudAPIAuditLogCollection',
  CLEAN_CACHE_LOG_DAO = 'cleanCacheLogDao',
  PRM_GATEWAY_DAO = 'prmGatewayDao',
  MPS_AUDIT_LOG_COLLECTION = 'mpsAuditLogCollection',
  TENANT_BROADCAST_RATE_LIMIT_COLLECTION = 'tenantBroadcastRateLimitCollection',
  STOP_BROADCAST_LOG_DAO = 'stopBroadcastLogDao',
  GET_BMID_LOG_DAO = 'getBmidLogDao',
  GET_PHONE_NUM_LOG_DAO = 'getPhoneNumLogDao',
  REG_PHONE_NUM_LOG_DAO = 'regPhoneNumLogDao',
  REMOVE_CREDIT_LINE_LOG_DAO = 'removeCreditLineLogDao',
  GET_OTP_LOG_DAO = 'getOtpLogDao',
  API_EXPLORER_LOG_DAO = 'apiExplorerLogDao',
  CANCEL_SUBSCRIPTION_QUESTIONNAIRE_DAO = 'cancelSubscriptionQuestionnaireDao',
  CREDIT_EVENT_LOG_DAO = 'creditEventLogDao',
  CLOUD_API_SETUP_PROCESS_DAO = 'cloudApiSetupProcessDao',
  ONBOARDING_FIX_LOG_DAO = 'onboardingFixLogDao',
}

export enum CollectionName {
  WATI_STATES_COLLECTION = 'WatiStates',
  CREDIT_CUSTOMER_COLLECTION = 'CreditCustomer',
  WEBHOOK_EVENT_WABA_COLLECTION = 'WebhookEventWaba',
  WATI_ROUTE_COLLECTION = 'WatiRoute',
  REGISTER_CLOUD_API_AUDIT_LOG_COLLECTION = 'RegisterCloudAPIAuditLog',
  MPS_AUDIT_LOG_COLLECTION = 'MpsAuditLog',
  TENANT_BROADCAST_RATE_LIMIT_COLLECTION = 'TenantBroadcastRateLimit',
  STOP_BROADCAST_LOG_COLLECTION = 'StopBroadcastLog',
}

export type ServerContainer = {
  [Token.ADMIN_USER_MONGOOSE_CONNECTION]: Connection;
  [Token.TENANTS_MONGOOSE_CONNECTION]: Connection;
  [Token.TENANT_DAO]: TenantDao;
  [Token.ADMIN_USER_DAO]: AdminUserDao;
  [Token.PARTNER_DAO]: PartnerDao;
  [Token.SETTINGS_DAO]: SettingsDao;
  [Token.LOGGER]: winston.Logger;
  [Token.BACKOFFICE_DB_UPDATE_LOGS_DAO]: BackofficeDbUpdateLogsDao;
  [Token.CREATE_USER_LOG_DAO]: CreateUserLogDao;
  [Token.TERMINATE_SUBSCRIPTION_LOG_DAO]: TerminateSubscriptionLogDao;
  [Token.FEATURE_ACCESS_CONTROL_DAO]: FeatureAccessControlDao;
  [Token.ADMIN_USER_TABLE_ACCESS_SETTING_DAO]: TableSettingDao;
  [Token.ADMIN_USER_COLUMN_ACCESS_SETTING_DAO]: ColumnSettingDao;
  [Token.WATI_STATES_DAO]: WatiStatesDao;
  [Token.CREDIT_CUSTOMER_DAO]: CreditCustomerDao;
  [Token.WEBHOOK_EVENT_WABA_COLLECTION]: Collection;
  [Token.WATI_ROUTE_COLLECTION]: Collection;
  [Token.REGISTER_CLOUD_API_AUDIT_LOG_COLLECTION]: Collection;
  [Token.CLEAN_CACHE_LOG_DAO]: CleanCacheLogDao;
  [Token.PRM_GATEWAY_DAO]: PrmGatewayDao;
  [Token.MPS_AUDIT_LOG_COLLECTION]: Collection;
  [Token.TENANT_BROADCAST_RATE_LIMIT_COLLECTION]: Collection;
  [Token.STOP_BROADCAST_LOG_DAO]: StopBroadcastRetriesDao;
  [Token.GET_BMID_LOG_DAO]: GetBmidLogDao;
  [Token.GET_PHONE_NUM_LOG_DAO]: GetPhoneNumLogDao;
  [Token.REG_PHONE_NUM_LOG_DAO]: RegPhoneNumLogDao;
  [Token.REMOVE_CREDIT_LINE_LOG_DAO]: RemoveCreditLineLogDao;
  [Token.GET_OTP_LOG_DAO]: GetOtpLogDao;
  [Token.API_EXPLORER_LOG_DAO]: ApiExplorerLogDao;
  [Token.CANCEL_SUBSCRIPTION_QUESTIONNAIRE_DAO]: CancelSubscriptionQuestionnaireDao;
  [Token.CREDIT_EVENT_LOG_DAO]: CreditEventLogDao;
  [Token.CLOUD_API_SETUP_PROCESS_DAO]: CloudApiSetupProcessDao;
  [Token.ONBOARDING_FIX_LOG_DAO]: OnboardingFixLogDao;
};

let cachedMongoClient: MongoClient;
let cachedPricingMongoClient: MongoClient;
let cachedPrmGatewayDBPool: Pool;

export const createServerRootDiContainer = async (
  database_DB_URL?: string,
  req?: NextApiRequest,
): Promise<ServerContainer> => {
  const {
    database_DB_URL: ENV_DB_URL,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    NODE_ENV,
    LOG_LEVEL,
    GCP_PROJECT_ID,
    NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION,
    BILLING_DB_URL,
    BILLING_DATABASE,
    AUDIT_LOG_DATABASE,
    NEXT_PUBLIC_DB_AUTH_CLEAN_CACHE_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_STOP_BROADCAST_LOG_COLLECTION,
    PRICING_DATABASE,
    PRICING_DB_URL,
    NEXT_PUBLIC_DB_AUTH_GET_PHONE_NUM_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_REG_PHONE_NUM_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_REMOVE_CREDIT_LINE_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_GET_BMID_LOG_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_GET_OTP_LOG_COLLECTION,
  } = getEnv();

  const logger = winston.createLogger({
    level: isLogLevel(LOG_LEVEL) ? LOG_LEVEL : 'info',
    defaultMeta: { application: 'backoffice-portal' },
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          maskAuth({
            nodeEnv: NODE_ENV,
          }),
          transformGCPLogFormat({
            nodeEnv: NODE_ENV,
            gcpProjectId: GCP_PROJECT_ID,
          }),
          winston.format.splat(),
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.json(),
          winston.format.metadata(),
        ),
      }),
    ],
  });

  logger.debug('NEXT_PUBLIC_DB_AUTH_DATABASE', NEXT_PUBLIC_DB_AUTH_DATABASE);

  const TENANTS_DATABASE = process.env.MT_DB_NAME;
  let url = '';
  if (TENANTS_DATABASE.includes('mt-dev-Tenants')) {
    url = 'mt-dev-wati-backoffice';
  } else if (TENANTS_DATABASE.includes('prod')) {
    url = 'mt-backoffice';
  } else if (TENANTS_DATABASE.includes('stage')) {
    url = 'stage';
  } else {
    url = 'http://localhost';
  }
  const { MT_DB_NAME, PARTNER_DATABASE } = await setEnv(url);
  const partner_DB_DATABASE = PARTNER_DATABASE;
  const partner_DB_COLLECTION = process.env.PARTNER_DB_COLLECTION;
  const BACOFFICE_DB_UPDATE_LOGS_COLLECTION =
    process.env.BACOFFICE_DB_UPDATE_LOGS_COLLECTION;
  const BACKOFFICE_FEATURE_ACCESS_CONTROL_COLLECTION =
    process.env.BACKOFFICE_FEATURE_ACCESS_CONTROL_COLLECTION;

  const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;
  const adminUserMongooseConnection = await mongoose
    .createConnection(database_DB_URL ?? ENV_DB_URL)
    .asPromise();

  const tenantsMongooseConnection = await mongoose
    .createConnection(database_DB_URL ?? ENV_DB_URL)
    .asPromise();

  const partnersMongooseConnection = await mongoose
    .createConnection(database_DB_URL ?? ENV_DB_URL)
    .asPromise();

  const billingMongooseConnection = await mongoose
    .createConnection(BILLING_DB_URL)
    .asPromise();

  if (!cachedPrmGatewayDBPool) {
    cachedPrmGatewayDBPool = await createPool({
      host: process.env.PRM_GATEWAY_DB_HOST,
      user: process.env.PRM_GATEWAY_DB_USER,
      port: process.env.PRM_GATEWAY_DB_PORT,
      password: process.env.PRM_GATEWAY_DB_PASSWORD,
      database: process.env.PRM_GATEWAY_DB_NAME,
      dateStrings: ['DATETIME'],
      waitForConnections: true,
      connectionLimit: 10,
      enableKeepAlive: true,
    });
    try {
      await cachedPrmGatewayDBPool.query('SELECT 1');
    } catch (error) {
      logger.error('PRM_GATEWAY_DB_CONNECTION_ERROR', error);
    }
  }

  const tenantDao = new TenantDao(
    tenantsMongooseConnection,
    TENANTS_DATABASE,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
  );
  const adminUserDao = new AdminUserDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    logger,
  );
  const partnerDao = new PartnerDao(
    partnersMongooseConnection,
    partner_DB_DATABASE,
    partner_DB_COLLECTION,
  );
  const settingsDao = new SettingsDao(
    tenantsMongooseConnection,
    TENANTS_DATABASE,
    MT_SETTING_COLLECTION_NAME,
  );
  const backofficeDbUpdateLogsDao = new BackofficeDbUpdateLogsDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    BACOFFICE_DB_UPDATE_LOGS_COLLECTION,
  );

  const createUserLogDao = new CreateUserLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION,
  );

  const terminateSubscriptionLogDao = new TerminateSubscriptionLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION,
  );

  const featureAccessControlDao = new FeatureAccessControlDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    BACKOFFICE_FEATURE_ACCESS_CONTROL_COLLECTION,
  );

  const tableSettingDao = new TableSettingDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION,
  );

  const columnSettingDao = new ColumnSettingDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION,
  );

  const watiStatesDao = new WatiStatesDao(
    tenantsMongooseConnection,
    TENANTS_DATABASE,
    CollectionName.WATI_STATES_COLLECTION,
  );

  const creditCustomerDao = new CreditCustomerDao(
    billingMongooseConnection,
    BILLING_DATABASE,
    CollectionName.CREDIT_CUSTOMER_COLLECTION,
  );

  if (!cachedMongoClient) {
    cachedMongoClient = new MongoClient(database_DB_URL ?? ENV_DB_URL);
    await cachedMongoClient.connect();
  }

  if (!cachedPricingMongoClient) {
    cachedPricingMongoClient = new MongoClient(PRICING_DB_URL);
    await cachedPricingMongoClient.connect();
  }

  const db = cachedMongoClient.db(TENANTS_DATABASE);
  const webhookEventWabaCollection = db.collection(
    CollectionName.WEBHOOK_EVENT_WABA_COLLECTION,
  );
  const watiRouteCollection = db.collection(
    CollectionName.WATI_ROUTE_COLLECTION,
  );

  const auditLogDb = cachedMongoClient.db(NEXT_PUBLIC_DB_AUTH_DATABASE);
  const registerCloudAPIAuditLogCollection = auditLogDb.collection(
    CollectionName.REGISTER_CLOUD_API_AUDIT_LOG_COLLECTION,
  );

  const mpsAuditLogCollection = auditLogDb.collection(
    CollectionName.MPS_AUDIT_LOG_COLLECTION,
  );

  const pricingDb = cachedPricingMongoClient.db(PRICING_DATABASE);
  const tenantBroadcastRateLimitCollection = pricingDb.collection(
    CollectionName.TENANT_BROADCAST_RATE_LIMIT_COLLECTION,
  );

  const cleanCacheLogDao = new CleanCacheLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_CLEAN_CACHE_LOG_COLLECTION,
  );

  const getBmidLogDao = new GetBmidLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_GET_BMID_LOG_COLLECTION,
  );

  const getPhoneNumLogDao = new GetPhoneNumLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_GET_PHONE_NUM_LOG_COLLECTION,
  );

  const regPhoneNumLogDao = new RegPhoneNumLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_REG_PHONE_NUM_LOG_COLLECTION,
  );

  const removeCreditLineLogDao = new RemoveCreditLineLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_REMOVE_CREDIT_LINE_LOG_COLLECTION,
  );

  const getOtpLogDao = new GetOtpLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_GET_OTP_LOG_COLLECTION,
  );

  const stopBroadcastLogDao = new StopBroadcastRetriesDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_STOP_BROADCAST_LOG_COLLECTION,
  );

  const apiExplorerLogDao = new ApiExplorerLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    'ApiExplorerLog',
  );

  const prmGatewayDao = new PrmGatewayDao(cachedPrmGatewayDBPool);

  const cancelSubscriptionQuestionnaireDao =
    new CancelSubscriptionQuestionnaireDao(
      tenantsMongooseConnection,
      TENANTS_DATABASE,
      'CancelSubscriptionQuestionnaire',
    );

  const creditEventLogDao = new CreditEventLogDao(
    billingMongooseConnection,
    BILLING_DATABASE,
    'CreditEventLog',
  );

  const cloudApiSetupProcessDao = new CloudApiSetupProcessDao(
    tenantsMongooseConnection,
    TENANTS_DATABASE,
    'CloudApiSetupProcess',
  );

  const onboardingFixLogDao = new OnboardingFixLogDao(
    adminUserMongooseConnection,
    NEXT_PUBLIC_DB_AUTH_DATABASE,
    'OnboardingFixLog',
  );

  return {
    [Token.ADMIN_USER_MONGOOSE_CONNECTION]: adminUserMongooseConnection,
    [Token.TENANTS_MONGOOSE_CONNECTION]: tenantsMongooseConnection,
    [Token.TENANT_DAO]: tenantDao,
    [Token.ADMIN_USER_DAO]: adminUserDao,
    [Token.PARTNER_DAO]: partnerDao,
    [Token.SETTINGS_DAO]: settingsDao,
    [Token.LOGGER]: logger,
    [Token.BACKOFFICE_DB_UPDATE_LOGS_DAO]: backofficeDbUpdateLogsDao,
    [Token.CREATE_USER_LOG_DAO]: createUserLogDao,
    [Token.TERMINATE_SUBSCRIPTION_LOG_DAO]: terminateSubscriptionLogDao,
    [Token.FEATURE_ACCESS_CONTROL_DAO]: featureAccessControlDao,
    [Token.ADMIN_USER_TABLE_ACCESS_SETTING_DAO]: tableSettingDao,
    [Token.ADMIN_USER_COLUMN_ACCESS_SETTING_DAO]: columnSettingDao,
    [Token.WATI_STATES_DAO]: watiStatesDao,
    [Token.CREDIT_CUSTOMER_DAO]: creditCustomerDao,
    [Token.WEBHOOK_EVENT_WABA_COLLECTION]: webhookEventWabaCollection,
    [Token.WATI_ROUTE_COLLECTION]: watiRouteCollection,
    [Token.REGISTER_CLOUD_API_AUDIT_LOG_COLLECTION]:
      registerCloudAPIAuditLogCollection,
    [Token.CLEAN_CACHE_LOG_DAO]: cleanCacheLogDao,
    [Token.STOP_BROADCAST_LOG_DAO]: stopBroadcastLogDao,
    [Token.API_EXPLORER_LOG_DAO]: apiExplorerLogDao,
    [Token.PRM_GATEWAY_DAO]: prmGatewayDao,
    [Token.MPS_AUDIT_LOG_COLLECTION]: mpsAuditLogCollection,
    [Token.TENANT_BROADCAST_RATE_LIMIT_COLLECTION]:
      tenantBroadcastRateLimitCollection,
    [Token.GET_BMID_LOG_DAO]: getBmidLogDao,
    [Token.GET_PHONE_NUM_LOG_DAO]: getPhoneNumLogDao,
    [Token.REG_PHONE_NUM_LOG_DAO]: regPhoneNumLogDao,
    [Token.REMOVE_CREDIT_LINE_LOG_DAO]: removeCreditLineLogDao,
    [Token.GET_OTP_LOG_DAO]: getOtpLogDao,
    [Token.CANCEL_SUBSCRIPTION_QUESTIONNAIRE_DAO]:
      cancelSubscriptionQuestionnaireDao,
    [Token.CREDIT_EVENT_LOG_DAO]: creditEventLogDao,
    [Token.CLOUD_API_SETUP_PROCESS_DAO]: cloudApiSetupProcessDao,
    [Token.ONBOARDING_FIX_LOG_DAO]: onboardingFixLogDao,
  };
};
