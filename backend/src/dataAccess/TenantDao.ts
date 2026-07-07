import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { Tenant, tenantSchema, TenantDto } from './models/Tenant';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class TenantDao implements IDao<Tenant, TenantDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<Tenant>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.Tenants as Model<Tenant>) ??
      mongooseConnection.model('Tenants', tenantSchema);

    return model;
  }

  async insertMany(tenants: Partial<Tenant>[]): Promise<void> {
    const model = await this.initModel();

    const tenantsCreateManyResponse = await model.insertMany(tenants);
    const insertedId = tenantsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('tenants_not_created');
    }
  }

  async get(id: string): Promise<WithId<TenantDto> | null> {
    const model = await this.initModel();
    const tenant = await model.findById(id, {}, { runValidators: true });

    return tenant
      ? {
          ...this.transformData(tenant),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof Tenant, Condition<Tenant>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof Tenant, Condition<Tenant>>>,
    sortBy?:
      | keyof Tenant
      | Partial<{ [key in keyof Tenant]: SortOrder | { $meta: 'textScore' } }>
      | [keyof Tenant, SortOrder][],
  ): Promise<Paginated<WithId<TenantDto>>> {
    const model = await this.initModel();
    const [tenants, count] = await (async (): Promise<[Document[], number]> => {
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
      data: tenants
        .slice(0, limit)
        .map((tenant) => tenant.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: tenants.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof Tenant,
    value: unknown,
  ): Promise<Tenant> {
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

  async deleteField(id: string, field: keyof Tenant): Promise<Tenant> {
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
    filters: Partial<Record<keyof Tenant, Condition<Tenant>>>,
    field: keyof Tenant,
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

  async updateOneByFilter(
    filters: Partial<Record<keyof Tenant, Condition<Tenant>>>,
    field: keyof Tenant,
    value: unknown,
    unset = false,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateOne(
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
    filters: Partial<Record<keyof Tenant, Condition<Tenant>>>,
    field: keyof Tenant,
    value: unknown,
    unset = false,
  ): Promise<WithId<Tenant> | null> {
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
    filters: Partial<Record<keyof Tenant, Condition<Tenant>>>,
    updates: Partial<Tenant>,
  ): Promise<WithId<Tenant> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      { $set: updates },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  transformData(data: WithId<Tenant>): WithId<TenantDto> {
    const transformedData = {
      ...R.omit(TenantDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }

  async getByFilter(
    filter: Partial<Record<keyof Tenant, Condition<Tenant>>>,
  ): Promise<WithId<TenantDto>[] | null> {
    const model = await this.initModel();
    const tenant = await model.find(filter, {}, { runValidators: true });

    return tenant ? tenant.map(this.transformData) : null;
  }
}
