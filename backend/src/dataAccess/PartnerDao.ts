/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { Partner, partnerSchema, PartnerDto } from './models/Partner';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class PartnerDao implements IDao<Partner, PartnerDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<Partner>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.Partners as Model<Partner>) ??
      mongooseConnection.model('Partner', partnerSchema);

    return model;
  }

  async insertMany(partners: Partial<Partner>[]): Promise<void> {
    const model = await this.initModel();

    const partnersCreateManyResponse = await model.insertMany(partners);
    const insertedId = partnersCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('partners_not_created');
    }
  }

  async get(id: string): Promise<WithId<PartnerDto> | null> {
    const model = await this.initModel();
    const partner = await model.findById(id, {}, { runValidators: true });

    return partner
      ? {
          ...this.transformData(partner),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof Partner, Condition<Partner>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof Partner, Condition<Partner>>>,
    sortBy?:
      | keyof Partner
      | Partial<{ [key in keyof Partner]: SortOrder | { $meta: 'textScore' } }>
      | [keyof Partner, SortOrder][],
  ): Promise<Paginated<WithId<PartnerDto>>> {
    const model = await this.initModel();
    const [partners, count] = await (async (): Promise<
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
      data: partners
        .slice(0, limit)
        .map((partner) => partner.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: partners.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof Partner,
    value: unknown,
  ): Promise<Partner> {
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

  async deleteField(id: string, field: keyof Partner): Promise<Partner> {
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
    filters: Partial<Record<keyof Partner, Condition<Partner>>>,
    field: keyof Partner,
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

  transformData(data: WithId<Partner>): WithId<PartnerDto> {
    const transformedData = {
      ...R.omit(PartnerDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
