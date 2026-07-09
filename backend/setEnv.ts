/* eslint-disable */
// @ts-nocheck
const setEnv = (url: string) => {
  const envConfig = {
    MT_DB_NAME: process.env.MT_DB_NAME,
    PARTNER_DATABASE: process.env.PARTNER_DB_DATABASE,
  };

  if (url.includes('stage')) {
    envConfig.MT_DB_NAME = 'mt-stage-Tenants';
    envConfig.PARTNER_DATABASE = 'wati_stage_partner_db';
  } else if (url.includes('mt-dev-wati-backoffice')) {
    envConfig.MT_DB_NAME = 'mt-dev-Tenants';
    envConfig.PARTNER_DATABASE = 'wati_dev_partner_db';
  } else if (url.includes('mt-backoffice')) {
    envConfig.MT_DB_NAME = 'mt-prod-Tenants';
    envConfig.PARTNER_DATABASE = 'wati_prod_partner_db';
  } else if (url.includes('http://localhost') || url.includes('integration')) {
    envConfig.MT_DB_NAME = 'mt-dev-integration-Tenants';
    envConfig.PARTNER_DATABASE = 'wati_dev_partner_db';
  } else if (url.includes('eu')) {
    envConfig.MT_DB_NAME = 'eu-prod-Tenants';
    envConfig.PARTNER_DATABASE = 'eu_prod_partner';
  }

  return envConfig;
};

export default setEnv;
