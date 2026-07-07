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
  TerminateSubscriptionLog,
  terminateSubscriptionLogSchema,
} from '@/dataAccess/models/TerminateSubscriptionLog';
import mongoose, { Model } from 'mongoose';

const {
  database_DB_URL,
  NEXT_PUBLIC_DB_AUTH_DATABASE,
  NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION,
} = getEnv();

const customOptions: { useUnifiedTopology: boolean } = {
  useUnifiedTopology: true,
};
const options: MongoClientOptions & typeof customOptions = customOptions;

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
      BackofficeFeature.CREATE_EXTERNAL_ADMIN,
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
      (mongooseConnection.models
        .TerminateSubscriptionLog as Model<TerminateSubscriptionLog>) ??
      mongooseConnection.model(
        NEXT_PUBLIC_DB_AUTH_TERMINATE_SUBSCRIPTION_LOG_COLLECTION,
        terminateSubscriptionLogSchema,
      );

    const {
      tenantId,
      tenantFirstName,
      watiInitial,
      reason,
      operationType,
      operationResult,
      isSuccess,
      loggedInUser,
      operationTimestamp,
    } = req.body;

    // Create a new document using the data from the request
    const newActivityLog = {
      tenantId,
      tenantFirstName,
      watiInitial,
      reason,
      operationType,
      operationResult,
      isSuccess,
      loggedInUser,
      operationTimestamp: operationTimestamp || new Date(), // Default to current date if not provided
    };

    const terminateSubscriptionLog = [newActivityLog];
    // Save the document to the database
    const result = await model.insertMany(terminateSubscriptionLog);
    console.log(' terminate subscription log inserted', result);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Error terminate subscription inserting data',
    });
  }
};
