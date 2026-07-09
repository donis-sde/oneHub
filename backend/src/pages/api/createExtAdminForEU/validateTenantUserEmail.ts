/* eslint-disable */
// @ts-nocheck
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { FindOptions, MongoClient, MongoClientOptions } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { getEnv } from '@/utils/getEnv';
import { Role } from '@/enums/Role';
import { HttpMethod } from '@/enums/HttpMethod';
import {
  CreateUserLog,
  createUserLogSchema,
} from '@/dataAccess/models/CreateUserLog';
import mongoose, { Model } from 'mongoose';

const {
  database_DB_URL,
  NEXT_PUBLIC_DB_AUTH_DATABASE,
  NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION,
} = getEnv();

const customOptions: { useUnifiedTopology: boolean } = {
  useUnifiedTopology: true,
};
const options: MongoClientOptions & typeof customOptions = customOptions;
const EU_USER_COLLECTION_NAME = process.env.EU_USER_COLLECTION_NAME;
const EU_DB_URL = process.env.EU_DB_URL;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener([
    createLogContextMiddleware(),

    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.GET,
          roles: [Role.ADMIN],
        },
        {
          httpMethod: HttpMethod.POST,
          roles: [Role.ADMIN],
        },
      ],
      BackofficeFeature.CREATE_EXTERNAL_ADMIN_FOR_EU,
    ),
    async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'createExtAdminHandler',
        API: 'createExtAdmin',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', { loggerMetadata });
      } else if (req.method === HttpMethod.POST) {
        console.log('request operation => ', req.query['operation']);
        const operation = req.query['operation'] ?? '';

        if (operation === 'validateemail') {
          logger.debug('validate email post', { loggerMetadata });
          return checkEmailExists(req, res);
        }
        if (operation === 'activitylog') {
          logger.debug('create user log', { loggerMetadata });
          return insertCreateUserLogs(req, res);
        }
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
}
const checkEmailExists = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  try {
    const { tenantId, email } = req.body;
    console.log('email', email, tenantId);
    const client = new MongoClient(EU_DB_URL, options);
    await client.connect();
    const EU_DB_NAME = process.env.EU_DB_NAME;
    const db = client.db(EU_DB_NAME);
    const usersCollection = db.collection(EU_USER_COLLECTION_NAME);

    // Creates a regex of: /^EmailAddress$/i
    var regexEmail = new RegExp(['^', email, '$'].join(''), 'i');

    const filter_query = {
      TenantId: tenantId,
      Email: regexEmail,
    };
    const projection = {
      _id: 1,
      FirstName: 1,
      LastName: 1,
      Email: 1,
    };
    const projections: FindOptions<Document> = {
      projection: projection,
    };
    const users = await usersCollection
      .find(filter_query, projections)
      .toArray();

    console.log('users', users);

    if (users && users.length > 0) {
      return res.status(200).json({ result: true as boolean });
    } else {
      return res.status(400).json({ result: false as boolean });
    }
  } catch (e) {
    console.log('validate error', e);
    return res.status(500).json({ result: false as boolean, error: e });
  }
};

export const insertCreateUserLogs = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> => {
  try {
    const mongooseConnection = await mongoose
      .createConnection(database_DB_URL)
      .useDb(NEXT_PUBLIC_DB_AUTH_DATABASE)
      .asPromise();

    const model =
      (mongooseConnection.models.CreateUserLog as Model<CreateUserLog>) ??
      mongooseConnection.model(
        NEXT_PUBLIC_DB_AUTH_CREATE_USER_LOG_COLLECTION,
        createUserLogSchema,
      );

    const {
      tenantId,
      tenantFirstName,
      email,
      firstName,
      lastName,
      passwordType,
      plainTextPassword,
      operationType,
      loggedInUser,
      operationTimestamp,
    } = req.body;

    // Create a new document using the data from the request
    const newActivityLog = {
      tenantId,
      tenantFirstName,
      email,
      firstName,
      lastName,
      passwordType,
      plainTextPassword,
      operationType,
      loggedInUser,
      operationTimestamp: operationTimestamp || new Date(), // Default to current date if not provided
    };

    const createUserLog = [newActivityLog];
    // Save the document to the database
    const result = await model.insertMany(createUserLog);
    console.log(' create user log inserted', result);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: 'Error inserting data' });
  }
};
