/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Transaction,
  TransactionDto,
  transactionSchema,
} from '@/dataAccess/models/Transaction';
import { IBackofficeDbUpdateLogs } from '@/dataAccess/models/BackofficeDbUpdateLogs';
import { HttpMethod } from '@/enums/HttpMethod';
import { Role } from '@/enums/Role';
import { getServerDiContainer } from '@/global/serverDiContainer';
import { createRbacMiddleware } from '@/middlewares/createRbacMiddleware';
import { Paginated, Paginator } from '@/types/Pagination';
import { applyResponse, HttpResponse } from '@/utils/httpResponseUtils';
import { middlewareFlattener } from '@/utils/middlewareFlattener';
import { parseFilterObject } from '@/utils/mongooseUtils';
import { Condition, WithId } from 'mongodb';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UpdateCollectionsResponse } from '@/pages/api/databases/[database]/collections/[collection]';
import {
  MongooseExtendedType,
  MongooseExtendedTypeEnum,
  isMongooseExtendedType,
} from '@/types/MongooseExtendedTypes';
import { FilterCriteria } from '@/types/FilterCriteria';
import mongoose, { FilterQuery } from 'mongoose';
import { createLogContextMiddleware } from '@/middlewares/createLogContextMiddleware';
import { BackofficePortalLoggingMetadata } from '@/types/LogContext';
import winston from 'winston';
import axios, { AxiosError } from 'axios';
import { TransactionDao } from '@/dataAccess/TransactionDao';
import { BackofficeFeature } from '@/enums/BackofficeFeature';

type GetTransactionsResponse = Paginated<WithId<TransactionDto>>;

const getTransactionDao = async (
  env: 'prod' | 'eu-prod' = 'prod',
): Promise<TransactionDao> => {
  try {
    return await TransactionDao.getInstance(env);
  } catch (error) {
    await TransactionDao.clearInstance();
    return await TransactionDao.getInstance(env);
  }
};

export const transactionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTransactionsResponse | UpdateCollectionsResponse>,
): Promise<void> => {
  try {
    const { logger } = await getServerDiContainer();

    await middlewareFlattener<
      GetTransactionsResponse | UpdateCollectionsResponse
    >([
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
          {
            httpMethod: HttpMethod.PUT,
            roles: [Role.ADMIN],
          },
          {
            httpMethod: HttpMethod.DELETE,
            roles: [Role.ADMIN],
          },
        ],
        BackofficeFeature.PARTNER_SHIP_MANAGEMENT,
      ),
      async (
        req: NextApiRequest,
        res: NextApiResponse<
          GetTransactionsResponse | UpdateCollectionsResponse
        >,
      ): Promise<void> => {
        const loggerMetadata: BackofficePortalLoggingMetadata = {
          ...req.logContext,
          functionName: 'transactionsHandler',
          API: 'databases',
        };

        if (req.method === HttpMethod.GET) {
          logger.debug('get', {
            loggerMetadata,
          });
          return getTransactionsHandler(req, res, logger, loggerMetadata);
        } else if (req.method === HttpMethod.POST) {
          logger.debug('post', {
            loggerMetadata,
          });
          if (!req.body.filters) {
            return createTransactionHandler(req, res, logger, loggerMetadata);
          }
          return updateTransactionsHandler(req, res, logger, loggerMetadata);
        } else if (req.method === HttpMethod.PUT) {
          logger.debug('put', {
            loggerMetadata,
          });
          return updateTransactionHandler(req, res, logger, loggerMetadata);
        } else if (req.method === HttpMethod.DELETE) {
          logger.debug('delete', {
            loggerMetadata,
          });
          return deleteTransactionHandler(req, res, logger, loggerMetadata);
        } else {
          throw new Error('bad_request');
        }
      },
    ])(req, res);
  } catch (error) {
    throw error;
  }
};

export const getTransactionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<GetTransactionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'getTransactionsHandler',
  };

  const {
    skip: skipRaw = '0',
    limit: limitRaw = '25',
    order: sortOrder = 'desc',
    orderBy: sortBy = 'Created',
    env = 'prod',
  } = req.query;

  const queryParams = { ...req.query };
  delete queryParams.skip;
  delete queryParams.limit;
  delete queryParams.order;
  delete queryParams.orderBy;
  delete queryParams.env;

  const skip = typeof skipRaw === 'string' ? parseInt(skipRaw) : null;
  const limit = typeof limitRaw === 'string' ? parseInt(limitRaw) : null;

  logger.debug('params', {
    params: {
      skip,
      limit,
      sortBy,
      sortOrder,
      env,
    },
    loggerMetadata: clonedLoggerMetadata,
  });

  if (skip === null || limit === null || isNaN(skip) || isNaN(limit)) {
    throw new Error('bad_request');
  }

  const searchFilter: Partial<
    Record<keyof Transaction, FilterQuery<Transaction>>
  > = {};
  if (queryParams.StripeSubscriptionId) {
    const value = Array.isArray(queryParams.StripeSubscriptionId)
      ? queryParams.StripeSubscriptionId[0]
      : queryParams.StripeSubscriptionId;
    if (value) {
      searchFilter.StripeSubscriptionId = { $eq: value };
    }
  }
  if (queryParams.StripeCustomerId) {
    const value = Array.isArray(queryParams.StripeCustomerId)
      ? queryParams.StripeCustomerId[0]
      : queryParams.StripeCustomerId;
    if (value) {
      searchFilter.StripeCustomerId = { $eq: value };
    }
  }

  try {
    const transactions = await getTransactions(
      { skip, limit },
      searchFilter,
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      env as 'prod' | 'eu-prod',
    );

    logger.debug('transactions', {
      transactions: JSON.parse(JSON.stringify(transactions)),
      loggerMetadata: clonedLoggerMetadata,
    });

    const httpResponse: HttpResponse<GetTransactionsResponse> = {
      response: transactions,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (error) {
    throw error;
  }
};

export const getTransactions = async (
  { skip, limit }: Paginator,
  filter?: Partial<Record<keyof Transaction, Condition<Transaction>>>,
  sortBy?: string,
  sortOrder: 'asc' | 'desc' = 'desc',
  env: 'prod' | 'eu-prod' = 'prod',
): Promise<GetTransactionsResponse> => {
  const transactionDao = await getTransactionDao(env);
  const transactions = await transactionDao.list(
    { skip, limit },
    filter,
    sortBy,
    sortOrder,
    env,
  );

  return transactions;
};

export const updateTransactionsHandler = async (
  req: NextApiRequest,
  res: NextApiResponse<UpdateCollectionsResponse>,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTransactionsHandler',
  };

  const { filters, editParams } = req.body;
  const { field, newValue = '', type } = editParams;
  const newValueSanitized = newValue ?? '';
  if (
    !Array.isArray(filters) ||
    filters.length === 0 ||
    !filters.every((filter) => isKeyOfTransaction(filter.field)) ||
    !isMongooseExtendedType(type) ||
    !isKeyOfTransaction(field) ||
    typeof newValueSanitized !== 'string'
  ) {
    logger.warn('bad_request', {
      params: {
        filters,
        type,
        field,
        newValue: newValueSanitized,
      },
      loggerMetadata: clonedLoggerMetadata,
    });

    throw new Error('bad_request');
  }

  logger.info('params', {
    params: {
      filters,
      type,
      field,
      newValue: newValueSanitized,
    },
    loggerMetadata: clonedLoggerMetadata,
  });
  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Transaction, Condition<Transaction>>
  >;
  const recordsToBeUpdated = await getTransactions(
    { skip: 0, limit: 100000 },
    parsedFilterObject,
  );

  const updateResult = await updateTransactions(
    filters,
    field,
    type,
    newValue,
    logger,
    clonedLoggerMetadata,
  );
  const { backofficeDbUpdateLogsDao } = await getServerDiContainer();
  const logData: Partial<IBackofficeDbUpdateLogs>[] =
    recordsToBeUpdated.data.map((record) => ({
      impactedRecordObjectId: JSON.stringify(record._id),
      tenantId: 'N/A',
      impactedRecordEmail: record?.EmailId,
      collectionName: process.env.PARTNER_DB_DATABASE,
      dbName: process.env.PARTNER_DB_COLLECTION,
      changedBy: loggerMetadata.userContext?.email,
      fieldChanged: field,
      oldValue: JSON.stringify(record?.[field as keyof TransactionDto]), // Log the old value of the updated field
      newValue: JSON.stringify(newValue),
      filterUsed: JSON.stringify(filters),
      timestamp: new Date(),
    }));
  await backofficeDbUpdateLogsDao.insertMany(logData);
  logger.info('updateResult', {
    result: updateResult,
    loggerMetadata: clonedLoggerMetadata,
  });

  const httpResponse: HttpResponse<UpdateCollectionsResponse> = {
    response: updateResult,
    status: 200,
  };

  applyResponse(httpResponse)(res);
};

export const isKeyOfTransaction = (v: string): v is keyof Transaction => {
  return !!transactionSchema.paths[v];
};

export const updateTransactions = async (
  filters: FilterCriteria[],
  field: keyof Transaction,
  type: MongooseExtendedType,
  newValue: string,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<UpdateCollectionsResponse> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTransactions',
  };

  const transactionDao = await getTransactionDao();

  logger.debug('params', {
    params: { filters, field, type, newValue },
    loggerMetadata: clonedLoggerMetadata,
  });

  const parsedFilterObject = parseFilterObject(filters) as Partial<
    Record<keyof Transaction, Condition<Transaction>>
  >;
  logger.debug('parsedFilterObject', {
    parsedFilterObject,
    loggerMetadata: clonedLoggerMetadata,
  });

  if (type === MongooseExtendedTypeEnum.NULL) {
    return await transactionDao.updateByFilter(parsedFilterObject, field, null);
  } else if (type === MongooseExtendedTypeEnum.UNSET) {
    return await transactionDao.updateByFilter(
      parsedFilterObject,
      field,
      null,
      true,
    );
  } else {
    if (type === MongooseExtendedTypeEnum.MAP) {
      return await transactionDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else if (type === mongoose.Schema.Types.Array.schemaName) {
      return await transactionDao.updateByFilter(
        parsedFilterObject,
        field,
        JSON.parse(newValue),
      );
    } else {
      return await transactionDao.updateByFilter(
        parsedFilterObject,
        field,
        newValue,
      );
    }
  }
};

export const deleteTransactionHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'deleteTransactionHandler',
  };

  const { id } = req.query;
  const env = req.query.env as 'prod' | 'eu-prod';

  if (!id || typeof id !== 'string' || !['prod', 'eu-prod'].includes(env)) {
    logger.error('Invalid parameters', {
      id,
      env,
      loggerMetadata: clonedLoggerMetadata,
    });
    const errorResponse: HttpResponse<{ error: string }> = {
      response: { error: 'Invalid parameters' },
      status: 400,
    };
    applyResponse(errorResponse)(res);
    return;
  }

  logger.debug('deleting transaction', {
    id,
    env,
    loggerMetadata: clonedLoggerMetadata,
  });

  try {
    const transactionDao = await getTransactionDao(env);
    const transaction = await transactionDao.get(id, env);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    try {
      await deleteTransactionFromPS(transaction);
    } catch (psError: unknown) {
      const errorMessage =
        psError instanceof AxiosError
          ? psError.response?.data || psError.message
          : 'Failed to delete from Partnership Service';
      throw new Error(errorMessage);
    }

    await transactionDao.delete(id, env);

    logger.info('Transaction deleted successfully from both PS and database', {
      id,
      env,
      loggerMetadata: clonedLoggerMetadata,
    });

    const httpResponse: HttpResponse<void> = {
      response: undefined,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (error: unknown) {
    logger.error('Error deleting transaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      loggerMetadata: clonedLoggerMetadata,
    });

    const errorResponse: HttpResponse<{ error: string }> = {
      response: {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to delete transaction',
      },
      status: 500,
    };
    applyResponse(errorResponse)(res);
  }
};

export const createTransactionHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'createTransactionHandler',
  };

  try {
    const transactionData = req.body;
    const env = req.query.env as 'prod' | 'eu-prod';
    const requiredFields = [
      'EmailId',
      'StripeSubscriptionId',
      'StripeCustomerId',
      'InvoiceNumber',
      'InvoiceAmount',
      'Currency',
      'InvoiceStatus',
    ];

    const missingFields = requiredFields.filter(
      (field) => !transactionData[field],
    );
    if (missingFields.length > 0) {
      const error = `Missing required fields: ${missingFields.join(', ')}`;
      logger.error(error, { loggerMetadata: clonedLoggerMetadata });
      throw new Error(error);
    }

    logger.debug('creating transaction', {
      transactionData,
      environment: env,
      loggerMetadata: clonedLoggerMetadata,
    });

    const transactionDao = await getTransactionDao(env);

    if (!transactionDao) {
      throw new Error(
        'TransactionDao not initialized. Please check database connection and environment variables.',
      );
    }

    const newTransactionId = await transactionDao.insert(transactionData, env);

    const createdTransaction = await transactionDao.get(newTransactionId, env);
    if (!createdTransaction) {
      throw new Error('Failed to retrieve created transaction');
    }

    await syncTransactionToPS(createdTransaction);

    const httpResponse: HttpResponse<{ id: string }> = {
      response: { id: newTransactionId },
      status: 201,
    };

    applyResponse(httpResponse)(res);
  } catch (error: unknown) {
    logger.error('Error creating transaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      loggerMetadata: clonedLoggerMetadata,
    });

    const errorResponse: HttpResponse<{ error: string; details?: string }> = {
      response: {
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      status: 500,
    };
    applyResponse(errorResponse)(res);
  }
};

export const updateTransactionHandler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  logger: winston.Logger,
  loggerMetadata: BackofficePortalLoggingMetadata,
): Promise<void> => {
  const clonedLoggerMetadata = {
    ...loggerMetadata,
    functionName: 'updateTransactionHandler',
  };

  try {
    const { id } = req.query;
    const transactionData = req.body;
    const env = req.query.env as 'prod' | 'eu-prod';

    if (!id || typeof id !== 'string') {
      logger.error('Invalid transaction ID', {
        id,
        loggerMetadata: clonedLoggerMetadata,
      });
      const errorResponse: HttpResponse<{ error: string }> = {
        response: { error: 'Invalid transaction ID' },
        status: 400,
      };
      applyResponse(errorResponse)(res);
      return;
    }

    logger.debug('updating transaction', {
      id,
      data: JSON.stringify(transactionData),
      loggerMetadata: clonedLoggerMetadata,
    });

    const transactionDao = await getTransactionDao(env);

    const fieldsToUpdate = [
      'EmailId',
      'StripeSubscriptionId',
      'StripeCustomerId',
      'InvoiceNumber',
      'InvoiceAmount',
      'Currency',
      'InvoiceStatus',
      'TransactionCategory',
      'PartnerKey',
      'InvoiceDate',
    ];

    for (const field of fieldsToUpdate) {
      if (field in transactionData) {
        if (field === 'InvoiceAmount' && transactionData[field] !== null) {
          transactionData[field] = Number(transactionData[field]);
          if (isNaN(transactionData[field])) {
            throw new Error(
              `Invalid InvoiceAmount value: ${transactionData[field]}`,
            );
          }
        }
        if (field === 'InvoiceDate' && transactionData[field]) {
          transactionData[field] = new Date(transactionData[field]);
          if (isNaN(transactionData[field].getTime())) {
            throw new Error(
              `Invalid InvoiceDate value: ${transactionData[field]}`,
            );
          }
        }
      }
    }

    for (const field of fieldsToUpdate) {
      if (field in transactionData) {
        await transactionDao.updateField(
          id as string,
          field as keyof Transaction,
          transactionData[field],
          env,
        );
      }
    }

    await transactionDao.updateField(
      id as string,
      'LastUpdated',
      new Date(),
      env,
    );

    logger.info('Transaction updated successfully', {
      id,
      loggerMetadata: clonedLoggerMetadata,
    });

    const httpResponse: HttpResponse<void> = {
      response: undefined,
      status: 200,
    };

    applyResponse(httpResponse)(res);
  } catch (error: unknown) {
    logger.error('Error updating transaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      loggerMetadata: clonedLoggerMetadata,
    });

    const errorResponse: HttpResponse<{ error: string }> = {
      response: {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update transaction',
      },
      status: 500,
    };
    applyResponse(errorResponse)(res);
  }
};

const syncTransactionToPS = async (
  transaction: WithId<TransactionDto>,
): Promise<void> => {
  try {
    const baseUrl = process.env.PARTNERSHIP_SERVICE_URL;
    if (!baseUrl) {
      throw new Error(
        'PARTNERSHIP_SERVICE_URL environment variable is not set',
      );
    }

    await axios.post(
      `${baseUrl}api/v1/Transaction/SyncSingleTransaction2PS`,
      transaction,
    );
  } catch (error) {
    throw error;
  }
};

const deleteTransactionFromPS = async (
  transaction: WithId<TransactionDto>,
): Promise<void> => {
  try {
    const baseUrl = process.env.PARTNERSHIP_SERVICE_URL;
    if (!baseUrl) {
      throw new Error(
        'PARTNERSHIP_SERVICE_URL environment variable is not set',
      );
    }

    await axios.post(
      `${baseUrl}api/v1/Transaction/DeleteSingleTransactionFromPS`,
      transaction,
    );
  } catch (error) {
    throw error;
  }
};
