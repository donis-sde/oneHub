/* eslint-disable */
// @ts-nocheck
import { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, MongoClientOptions } from 'mongodb';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import { getEnv } from '@/utils/getEnv';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

const rbacRules = [
  { roles: [Role.ADMIN], httpMethod: HttpMethod.GET }, // Allow only admin users to access this endpoint
];

const rbacMiddleware = createRbacMiddleware(
  rbacRules,
  BackofficeFeature.FRT_REPORT,
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await rbacMiddleware(req, res, async () => {
      const DB_URL = process.env.DB_URL;
      const MT_DB_NAME = process.env.MT_DB_NAME;
      const MT_USER_COLLECTION_NAME = process.env.MT_USER_COLLECTION_NAME;
      const { tenantId } = req.query;
      let client: MongoClient | undefined;

      // Validate tenant ID by checking if it exists in the MongoDB collection
      try {
        const customOptions: { useUnifiedTopology: boolean } = {
          useUnifiedTopology: true,
        };

        const options: MongoClientOptions & typeof customOptions =
          customOptions;
        client = new MongoClient(DB_URL, options);

        await client.connect();

        const db = client.db(MT_DB_NAME);
        const collection = db.collection(MT_USER_COLLECTION_NAME);
        const existingTenant = await collection.findOne({ TenantId: tenantId });
        if (existingTenant) {
          // Tenant ID exists in the collection
          res.status(200).json({ isValid: true, data: existingTenant });
        } else {
          // Tenant ID does not exist in the collection
          res.status(400).json({ isValid: false, error: 'Invalid Tenant ID' });
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
