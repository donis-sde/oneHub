/* eslint-disable @typescript-eslint/no-explicit-any */
// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { HttpMethod } from '@/enums/HttpMethod';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { MongoClient, MongoClientOptions, UpdateResult } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose, { Model } from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import winston from 'winston';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import { BackofficeFeature } from '@/enums/BackofficeFeature';
import { Role } from '@/enums/Role';
import {
  ContactActivityLog,
  contactActivityLogSchema,
} from '@/dataAccess/models/ContactActivityLog';
import { getEnv } from '@/utils/getEnv';

const customOptions: { useUnifiedTopology: boolean } = {
  useUnifiedTopology: true,
};
const options: MongoClientOptions & typeof customOptions = customOptions;

const {
  database_DB_URL,
  NEXT_PUBLIC_DB_AUTH_DATABASE,
  NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
  NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION,
  NEXT_PUBLIC_DB_AUTH_CONTACT_ACTIVITY_LOG_COLLECTION,
} = getEnv();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<void> {
  const { logger } = await getServerDiContainer();
  await middlewareFlattener([
    createLogContextMiddleware(),
    createRbacMiddleware(
      [
        {
          httpMethod: HttpMethod.GET,
          roles: [Role.ADMIN] as Role[],
        },
        {
          httpMethod: HttpMethod.POST,
          roles: [Role.ADMIN] as Role[],
        },
      ],
      BackofficeFeature.DELETE_CONTACT,
    ),
    async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
      const loggerMetadata: BackofficePortalLoggingMetadata = {
        ...req.logContext,
        functionName: 'contactsHandler',
        API: 'databases',
      };

      if (req.method === HttpMethod.GET) {
        logger.debug('get', {
          loggerMetadata,
        });
        const operation = req.query['operation'] ?? 'insert';
        if (operation === 'logs') {
          return getContactActivityLogsHandler(
            req,
            res,
            logger,
            loggerMetadata,
          );
        } else if (operation === 'verify') {
          return verifyTenantId(req, res, logger, loggerMetadata);
        } else {
          return getTenantContactCountsHandler(
            req,
            res,
            logger,
            loggerMetadata,
          );
        }
      } else if (req.method === HttpMethod.POST) {
        logger.debug('post', { loggerMetadata });

        console.log('request operation => ', req.query['operation']);
        const operation = req.query['operation'] ?? 'insert';
        if (operation === 'update') {
          logger.debug('update post', {
            loggerMetadata,
          });

          return updateContactHandler(req, res, logger, loggerMetadata);
        } else if (operation === 'activitylog') {
          return insertContactActivityLogs(req, res, logger, loggerMetadata);
        }
      } else {
        throw new Error('bad_request');
      }
    },
  ])(req, res);
}

export const verifyTenantId = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const MT_SETTING_COLLECTION_NAME = process.env
    .MT_SETTING_COLLECTION_NAME as string;

  try {
    const { tenantId } = req.query; // Assuming tenantId is passed as a single value in the query
    const client = new MongoClient(database_DB_URL, options);
    await client.connect();
    const MT_DB_NAME = process.env.MT_DB_NAME;
    const db = client.db(MT_DB_NAME);
    const settingsCollection = db.collection(MT_SETTING_COLLECTION_NAME);
    const tenantCollection = db.collection(
      NEXT_PUBLIC_DB_TENANT_TENANT_COLLECTION,
    );

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
      if (!existingTenant?.TenantId) {
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
      res.status(404).json({ TenantId: tenantId, error: 'Invalid Tenant ID' });
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getTenantContactCountsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTenantContactCountsHandler',
  };

  try {
    const { tenantId, startDate, endDate } = req.query as {
      tenantId: string;
      startDate: string;
      endDate: string;
    };

    const client = new MongoClient(database_DB_URL, options);
    await client.connect();
    const MT_DB_NAME = process.env.MT_DB_NAME;
    const db = client.db(MT_DB_NAME);
    const contactCollection = db.collection(
      NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION,
    );

    let totalContactCountResult = 0;
    let totalDeletedContactCountResult = 0;
    if (startDate && endDate) {
      totalContactCountResult = await contactCollection.countDocuments({
        TenantId: tenantId,
        Created: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      });

      totalDeletedContactCountResult = await contactCollection.countDocuments({
        TenantId: tenantId,
        Created: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
        IsDeleted: true,
      });
    } else {
      totalContactCountResult = await contactCollection.countDocuments({
        TenantId: tenantId,
      });

      totalDeletedContactCountResult = await contactCollection.countDocuments({
        TenantId: tenantId,
        IsDeleted: true,
      });
    }

    const contactCounts = {
      totalContacts: totalContactCountResult,
      notDeletedContacts: Math.abs(
        totalContactCountResult - totalDeletedContactCountResult,
      ),
      deletedContacts: totalDeletedContactCountResult,
    };
    if (totalContactCountResult) {
      res.status(200).json(contactCounts);
    } else {
      res.status(404).json({ TenantId: tenantId, error: 'Invalid Tenant ID' });
    }
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getContactActivityLogsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  try {
    const clonedLoggerMetadata = {
      ...loggerMetadata,
      functionName: 'getContactActivityLogsHandler',
    };
    const { tenantId, operationType } = req.query; // Assuming teanantId is passed as a single value in the query

    const client = new MongoClient(database_DB_URL, options);
    await client.connect();

    const db = client.db(NEXT_PUBLIC_DB_AUTH_DATABASE);
    const contactActivityLogCollection = db.collection(
      NEXT_PUBLIC_DB_AUTH_CONTACT_ACTIVITY_LOG_COLLECTION,
    );
    // Fetch the logs filtered by operationType and tenantId, sorted by operationTimestamp in descending order
    const contacts = await contactActivityLogCollection
      .find({
        tenantId: tenantId,
        operationType: operationType,
      })
      .sort({ operationTimestamp: -1 }) // Sort by operationTimestamp in descending order
      .toArray();

    res.status(200).json({ success: true, data: contacts });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch activity logs' });
  }
};

export const updateContactHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateContactHandler',
  };

  const MT_DB_URL = process.env.DB_URL as string;
  const MT_DB_NAME = process.env.MT_DB_NAME;
  const MT_USER_COLLECTION_NAME = process.env
    .NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION as string;
  const { tenantId, startDate, endDate } = req.body; // Assuming teanantId is passed as a single value in the query
  const action = req.query['action'] ?? 'deleteAll';
  let client: MongoClient | undefined;

  try {
    const customOptions: { useUnifiedTopology: boolean } = {
      useUnifiedTopology: true,
    };

    const options: MongoClientOptions & typeof customOptions = customOptions;
    client = new MongoClient(MT_DB_URL, options);

    await client.connect();

    const db = client.db(MT_DB_NAME);
    const tenantCollection = db.collection(MT_USER_COLLECTION_NAME);

    // Update documents that match the date range
    let result = {} as UpdateResult;
    if (action === 'deleteAll') {
      result = await db
        .collection(NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION)
        .updateMany(
          {
            TenantId: tenantId,
            IsDeleted: false,
          },
          {
            $set: { IsDeleted: true },
          },
        );
    } else {
      // Validate input dates
      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ message: 'Start date and end date are required' });
      }

      // Convert input dates to JavaScript Date objects
      const start = new Date(startDate);
      const end = new Date(endDate);

      result = await db
        .collection(NEXT_PUBLIC_DB_TENANT_CONTACT_COLLECTION)
        .updateMany(
          {
            TenantId: tenantId,
            Created: { $gte: start, $lte: end },
            IsDeleted: false,
          },
          {
            $set: { IsDeleted: true },
          },
        );
    }
    res.status(200).json({
      message: 'Documents updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const insertContactActivityLogs = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  try {
    const mongooseConnection = await mongoose
      .createConnection(database_DB_URL)
      .useDb(NEXT_PUBLIC_DB_AUTH_DATABASE)
      .asPromise();

    const model =
      (mongooseConnection.models
        .ContactActivityLog as Model<ContactActivityLog>) ??
      mongooseConnection.model(
        NEXT_PUBLIC_DB_AUTH_CONTACT_ACTIVITY_LOG_COLLECTION,
        contactActivityLogSchema,
      );

    const {
      tenantId,
      tenantFirstName,
      loggedInUser,
      operationType,
      operationOption,
      operationFilters,
      beforeOperationCounts,
      afterOperationCounts,
      operationTimestamp,
    } = req.body;

    // Create a new document using the data from the request
    const newActivityLog = {
      tenantId,
      tenantFirstName,
      loggedInUser,
      operationType,
      operationOption,
      operationFilters,
      beforeOperationCounts,
      afterOperationCounts,
      operationTimestamp: operationTimestamp || new Date(), // Default to current date if not provided
    };

    const defaultStudents = [newActivityLog];
    // Save the document to the database
    const result = await model.insertMany(defaultStudents);
    console.log(' log inserted', result);
    return res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: 'Error inserting data' });
  }
};
