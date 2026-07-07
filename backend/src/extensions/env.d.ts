/* eslint-disable @typescript-eslint/no-unused-vars */
namespace NodeJS {
  interface ProcessEnv {
    JWT_SECRET: string | undefined;
    DB_URL: string | undefined;
    PARTNER_DB_DATABASE: string | undefined;
    PARTNER_DB_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_DATABASE: string | undefined;
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION: string | undefined;
    TENANTS_DATABASE: string | undefined;
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_COLUMN_ACCESS_SETTING_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_TABLE_ACCESS_SETTING_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_CONTACT_ACTIVITY_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION:
      | string
      | undefined;
    MT_USER_COLLECTION_NAME: string | undefined;
    NODE_ENV: 'development' | 'production' | undefined;
    NEXT_PUBLIC_DB_AUTH_CLEAN_CACHE_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_STOP_BROADCAST_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_GET_BMID_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_GET_PHONE_NUM_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_REG_PHONE_NUM_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_REMOVE_CREDIT_LINE_LOG_COLLECTION: string | undefined;
    NEXT_PUBLIC_DB_AUTH_GET_OTP_LOG_COLLECTION: string | undefined;
  }
}
