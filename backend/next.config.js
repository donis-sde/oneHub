/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['swagger-ui-react', 'swagger-ui'],
  env: {
    PARTNER_DB_DATABASE: process.env.PARTNER_DB_DATABASE,
    PARTNER_DB_COLLECTION: process.env.PARTNER_DB_COLLECTION,
    NEXT_PUBLIC_DB_AUTH_DATABASE: process.env.NEXT_PUBLIC_DB_AUTH_DATABASE,
    NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION:
      process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION,
    TENANTS_DATABASE: process.env.TENANTS_DATABASE,
    NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION:
      process.env.NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
    MT_SETTING_COLLECTION_NAME: process.env.MT_SETTING_COLLECTION_NAME,
  },
};

module.exports = nextConfig;
