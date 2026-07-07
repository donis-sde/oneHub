/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

const rbacRules = [
  {
    roles: [Role.ADMIN],
    httpMethod: HttpMethod.GET,
  }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.CREATE_EXTERNAL_ADMIN,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const MT_DB_URL = process.env.DB_URL;
      const MT_DB_NAME = process.env.MT_DB_NAME;
      const MT_USER_COLLECTION_NAME =
        process.env.NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION;
      const MT_SETTING_COLLECTION_NAME = process.env.MT_SETTING_COLLECTION_NAME;
      const { tenantId } = req.query; // Assuming tenantId is passed as a single value in the query

      let client: MongoClient | undefined;

      try {
        const customOptions: { useUnifiedTopology: boolean } = {
          useUnifiedTopology: true,
        };

        const options: MongoClientOptions & typeof customOptions =
          customOptions;
        client = new MongoClient(MT_DB_URL, options);

        await client.connect();

        const db = client.db(MT_DB_NAME);
        const settingsCollection = db.collection(MT_SETTING_COLLECTION_NAME);
        const tenantCollection = db.collection(MT_USER_COLLECTION_NAME);

        const existingTenantSettings = await settingsCollection.findOne({
          TenantId: tenantId,
        });

        if (existingTenantSettings) {
          const subs_id =
            existingTenantSettings.GeneralSetting.StripeSubscriptionId;
          const existingTenant = await tenantCollection.findOne({
            StripeSubscriptionId: subs_id,
          });

          let tenantDataWithProperId;
          if (!existingTenant.TenantId) {
            tenantDataWithProperId = {
              ...existingTenant,
              TenantId: tenantId,
            };
          } else {
            tenantDataWithProperId = {
              ...existingTenant,
            };
          }
          res.status(200).json(tenantDataWithProperId);
        } else {
          res
            .status(404)
            .json({ TenantId: tenantId, error: 'Invalid Tenant ID' });
        }
      } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } finally {
        if (client) {
          await client.close();
        }
      }
    });
  } catch (error) {
    console.error('RBAC middleware error:', error);
    res.status(403).json({ error: 'Forbidden' });
  }
}
