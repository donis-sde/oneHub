/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import { CreditCustomer, creditCustomerSchema } from './models/CreditCustomer';
import { BatchUpdateResult, IDao } from './_types/IDao';
import * as R from 'ramda';

export class CreditCustomerDao implements IDao<CreditCustomer, CreditCustomer> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CreditCustomer>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.CreditCustomer as Model<CreditCustomer>) ??
      mongooseConnection.model('CreditCustomer', creditCustomerSchema);

    return model;
  }

  async count(
    filter?: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
    sortBy?:
      | keyof CreditCustomer
      | Partial<{ [key in keyof CreditCustomer]: SortOrder }>
      | [keyof CreditCustomer, SortOrder][],
  ): Promise<Paginated<WithId<CreditCustomer>>> {
    const model = await this.initModel();
    const [creditCustomers, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { Created: -1 }),
          model.countDocuments(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { Created: -1 }),
          model.countDocuments(),
        ]);
      }
    })();

    return {
      data: creditCustomers
        .slice(0, limit)
        .map((creditCustomer) => creditCustomer.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: creditCustomers.length === limit + 1,
      count,
    };
  }

  async get(id: string): Promise<WithId<CreditCustomer> | null> {
    const model = await this.initModel();
    const creditCustomer = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return creditCustomer
      ? {
          ...this.transformData(creditCustomer),
          _id: new ObjectId(id),
        }
      : null;
  }

  async updateField(
    id: string,
    field: keyof CreditCustomer,
    value: unknown,
  ): Promise<CreditCustomer> {
    const model = await this.initModel();

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

  async updateByFilter(
    filters: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
    field: keyof CreditCustomer,
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

  async findAndUpdateOne(
    filters: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
    field: keyof CreditCustomer,
    value: unknown,
    unset = false,
  ): Promise<WithId<CreditCustomer> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      unset
        ? {
            $unset: { [field]: value },
          }
        : {
            $set: { [field]: value },
          },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  async findAndUpdateOneMultiple(
    filters: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
    updates: Partial<CreditCustomer>,
  ): Promise<WithId<CreditCustomer> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      { $set: updates },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  transformData(data: WithId<CreditCustomer>): WithId<CreditCustomer> {
    const transformedData = {
      ...R.omit(CreditCustomerDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }

  async getByFilter(
    filter: Partial<Record<keyof CreditCustomer, Condition<CreditCustomer>>>,
  ): Promise<WithId<CreditCustomer>[] | null> {
    const model = await this.initModel();
    const creditCustomers = await model.find(
      filter,
      {},
      { runValidators: true },
    );

    return creditCustomers ? creditCustomers.map(this.transformData) : null;
  }
}
