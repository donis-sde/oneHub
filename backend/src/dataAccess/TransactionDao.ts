/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  Transaction,
  transactionSchema,
  TransactionDto,
} from './models/Transaction';
import { BatchUpdateResult, IDao } from './_types/IDao';
import mongoose from 'mongoose';
import { getEnv } from '@/utils/getEnv';

export class TransactionDao implements IDao<Transaction, TransactionDto> {
  private static instance: TransactionDao | null = null;
  private prodConnection: Connection;
  private euConnection: Connection;
  private currentConnection: Connection;
  private database: string;
  private collection: string;
  private currentEnv: 'prod' | 'eu-prod' = 'prod';

  private constructor(
    public readonly database: string,
    public readonly collection: string,
  ) {
    this.prodConnection = null;
    this.euConnection = null;
    this.currentConnection = null;
    this.database = database;
    this.collection = collection;
  }

  public static async getInstance(
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<TransactionDao> {
    const database =
      env === 'eu-prod'
        ? process.env.EU_PARTNER_DB_DATABASE
        : process.env.PROD_PARTNER_DB_DATABASE;
    console.log('database', database);
    const collection = process.env.TRANSACTION_DB_COLLECTION;

    if (!database || !collection) {
      throw new Error('Database configuration not found');
    }

    if (!TransactionDao.instance) {
      TransactionDao.instance = new TransactionDao(database, collection);
      TransactionDao.instance.currentEnv = env;
    } else if (TransactionDao.instance.currentEnv !== env) {
      await TransactionDao.clearInstance();
      TransactionDao.instance = new TransactionDao(database, collection);
      TransactionDao.instance.currentEnv = env;
    }

    return TransactionDao.instance;
  }

  public static async clearInstance(): Promise<void> {
    if (TransactionDao.instance) {
      if (TransactionDao.instance.prodConnection) {
        await TransactionDao.instance.prodConnection.close();
      }
      if (TransactionDao.instance.euConnection) {
        await TransactionDao.instance.euConnection.close();
      }
      TransactionDao.instance = null;
    }
  }

  private validateMongoUrl(url: string): boolean {
    return url.startsWith('mongodb://') || url.startsWith('mongodb+srv://');
  }

  private setConnection(env: 'prod' | 'eu-prod'): void {
    if (env === 'prod') {
      this.currentConnection = this.prodConnection;
    } else {
      this.currentConnection = this.euConnection;
    }

    if (!this.currentConnection) {
      throw new Error(`${env} connection not initialized`);
    }
  }

  async ensureConnections(): Promise<void> {
    try {
      const supportEuDb = process.env.NEXT_PUBLIC_SUPPORT_EU_DB === 'true';
      const euDbUrl = process.env.EU_PARTNERSHIP_DB_URL;
      const prodDbUrl = process.env.PARTNERSHIP_DB_URL;

      if (this.currentEnv === 'eu-prod' && supportEuDb) {
        if (!this.euConnection) {
          if (!euDbUrl) {
            throw new Error('EU database connection URL is not configured.');
          }

          if (!this.validateMongoUrl(euDbUrl)) {
            throw new Error('Invalid MongoDB URL format');
          }

          this.euConnection = await mongoose
            .createConnection(euDbUrl, {
              useNewUrlParser: true,
              useUnifiedTopology: true,
              serverSelectionTimeoutMS: 5000,
            })
            .asPromise();
        }
      } else {
        if (!this.prodConnection) {
          if (!prodDbUrl) {
            throw new Error(
              'NEXT_PUBLIC_DB_URL environment variable is not set',
            );
          }

          if (!this.validateMongoUrl(prodDbUrl)) {
            throw new Error('Invalid MongoDB URL format');
          }

          this.prodConnection = await mongoose
            .createConnection(prodDbUrl, {
              useNewUrlParser: true,
              useUnifiedTopology: true,
              serverSelectionTimeoutMS: 5000,
            })
            .asPromise();
        }
      }
    } catch (error) {
      console.error('Connection error:', error);
      throw error;
    }
  }

  async initModel(
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<Model<Transaction>> {
    try {
      await this.ensureConnections();

      if (env === 'eu-prod' && !this.euConnection) {
        throw new Error('EU connection not available');
      }

      this.setConnection(env);

      const database = this.database;
      if (!database) {
        throw new Error('PARTNER_DB_DATABASE environment variable is not set');
      }

      const collection = this.collection;
      if (!collection) {
        throw new Error(
          'TRANSACTION_DB_COLLECTION environment variable is not set',
        );
      }

      const mongooseConnection = this.currentConnection.useDb(database);

      // Delete existing model if it exists to ensure fresh connection
      if (mongooseConnection.models[collection]) {
        delete mongooseConnection.models[collection];
      }

      const model = mongooseConnection.model(collection, transactionSchema);

      return model;
    } catch (error) {
      console.error('InitModel failed:', error.message, error.stack);
      throw error;
    }
  }

  async insert(
    transaction: Partial<Transaction>,
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<string> {
    try {
      await this.ensureConnections();
      this.setConnection(env);

      const model = await this.initModel(env);

      const transactionData = {
        ...transaction,
        InvoiceAmount: transaction.InvoiceAmount
          ? Number(transaction.InvoiceAmount)
          : null,
      };

      const transactionCreateResponse = await model.create(transactionData);

      const insertedId = transactionCreateResponse._id;

      if (!insertedId) {
        throw new Error('transaction_not_created');
      }

      return insertedId.toString();
    } catch (error) {
      console.error('Insert failed:', error.message, error.stack);
      throw error;
    }
  }

  async insertMany(transactions: Partial<Transaction>[]): Promise<void> {
    const model = await this.initModel();

    const transactionsCreateManyResponse = await model.insertMany(transactions);
    const insertedId = transactionsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('transactions_not_created');
    }
  }

  async get(
    id: string,
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<WithId<TransactionDto> | null> {
    const model = await this.initModel(env);
    const transaction = await model.findById(id, {}, { runValidators: true });

    return transaction
      ? {
          ...this.transformData(transaction),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof Transaction, Condition<Transaction>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    paginator: Paginator,
    filter?: Partial<Record<keyof Transaction, Condition<Transaction>>>,
    sortBy?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<Paginated<WithId<TransactionDto>>> {
    try {
      const model = await this.initModel(env);

      const query = filter ? this.transformFilter(filter) : {};

      const sort = sortBy
        ? { [sortBy]: sortOrder === 'asc' ? 1 : -1 }
        : { Created: -1 };

      const totalCount = await model.countDocuments({});

      const [data, count] = await Promise.all([
        model
          .find(query)
          .sort(sort)
          .skip(paginator.skip)
          .limit(paginator.limit)
          .lean()
          .exec(),
        model.countDocuments(query),
      ]);

      return {
        data: data.map((item) => ({
          ...this.transformData(item),
          _id: new ObjectId(item._id),
        })),
        count,
      };
    } catch (error) {
      throw error;
    }
  }

  async updateField(
    id: string,
    field: keyof Transaction,
    value: unknown,
    env: 'prod' | 'eu-prod' = 'prod',
  ): Promise<Transaction> {
    const model = await this.initModel(env);

    const updateDoc = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { [field]: value } },
      { runValidators: true, new: true },
    );

    if (!updateDoc) {
      throw new Error('not_updated');
    }

    return updateDoc;
  }

  async deleteField(
    id: string,
    field: keyof Transaction,
  ): Promise<Transaction> {
    const model = await this.initModel();

    const updateDoc = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $unset: { [field]: '' } },
      { runValidators: true, new: true },
    );

    if (!updateDoc) {
      throw new Error('not_updated');
    }

    return updateDoc;
  }

  async updateByFilter(
    filters: Partial<Record<keyof Transaction, Condition<Transaction>>>,
    field: keyof Transaction,
    value: unknown,
    unset = false,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateMany(
      filters,
      unset
        ? {
            $unset: { [field]: value },
          }
        : {
            $set: { [field]: value },
          },
      { runValidators: true },
    );

    return {
      matchedCount: result.matchedCount,
      updatedCount: result.modifiedCount,
    };
  }

  async delete(id: string, env: 'prod' | 'eu-prod' = 'prod'): Promise<void> {
    const model = await this.initModel(env);
    const result = await model.findByIdAndDelete(id);

    if (!result) {
      throw new Error('transaction_not_found');
    }
  }

  private transformData(data: any): Transaction {
    const transformed = {
      id: data._id?.toString(),
      EmailId: data.EmailId,
      StripeSubscriptionId: data.StripeSubscriptionId,
      StripeCustomerId: data.StripeCustomerId,
      InvoiceNumber: data.InvoiceNumber,
      InvoiceAmount: data.InvoiceAmount ? Number(data.InvoiceAmount) : null,
      Currency: data.Currency,
      InvoiceStatus: data.InvoiceStatus,
      TransactionCategory: data.TransactionCategory || 'Subscription',
      PartnerKey: data.PartnerKey,
      InvoiceDate: data.InvoiceDate ? new Date(data.InvoiceDate) : null,
      Created: data.Created ? new Date(data.Created) : null,
      LastUpdated: data.LastUpdated ? new Date(data.LastUpdated) : null,
    };
    return transformed;
  }

  private transformFilter(
    filter: Partial<Record<keyof Transaction, Condition<Transaction>>>,
  ): any {
    const transformedFilter: any = {};

    Object.entries(filter).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        return;
      }

      if (key === 'Created' || key === 'LastUpdated' || key === 'InvoiceDate') {
        if (typeof value === 'string') {
          transformedFilter[key] = new Date(value);
        } else if (value instanceof Date) {
          transformedFilter[key] = value;
        }
      } else if (key === 'InvoiceAmount') {
        transformedFilter[key] = Number(value);
      } else if (
        key === 'StripeSubscriptionId' ||
        key === 'StripeCustomerId' ||
        key === 'EmailId'
      ) {
        if (typeof value === 'string') {
          transformedFilter[key] = value;
        } else if (typeof value === 'object') {
          if (Object.keys(value).length === 0) {
            return;
          }
          transformedFilter[key] = value;
        }
      } else {
        transformedFilter[key] = value;
      }
    });

    return transformedFilter;
  }
}
