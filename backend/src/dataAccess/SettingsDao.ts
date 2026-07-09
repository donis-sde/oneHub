/* eslint-disable */
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { Settings, settingsSchema, SettingsDto } from './models/Settings';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class SettingsDao implements IDao<Settings, SettingsDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<Settings>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.Settings as Model<Settings>) ??
      mongooseConnection.model('Settings', settingsSchema);

    return model;
  }

  async insertMany(settings: Partial<Settings>[]): Promise<void> {
    const model = await this.initModel();

    const settingsCreateManyResponse = await model.insertMany(settings);
    const insertedId = settingsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('settings_not_created');
    }
  }

  async get(id: string): Promise<WithId<SettingsDto> | null> {
    const model = await this.initModel();
    const setting = await model.findById(id, {}, { runValidators: true });

    return setting
      ? {
          ...this.transformData(setting),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof Settings, Condition<Settings>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof Settings, Condition<Settings>>>,
    sortBy?:
      | keyof Settings
      | Partial<{ [key in keyof Settings]: SortOrder | { $meta: 'textScore' } }>
      | [keyof Settings, SortOrder][],
  ): Promise<Paginated<WithId<SettingsDto>>> {
    const model = await this.initModel();
    const [settings, count] = await (async (): Promise<
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
      data: settings
        .slice(0, limit)
        .map((setting) => setting.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: settings.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof Settings,
    value: unknown,
  ): Promise<Settings> {
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

  async deleteField(id: string, field: keyof Settings): Promise<Settings> {
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
    filters: Partial<Record<keyof Settings, Condition<Settings>>>,
    field: keyof Settings,
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
    filters: Partial<Record<keyof Settings, Condition<Settings>>>,
    field: keyof Settings,
    value: unknown,
    unset = false,
  ): Promise<WithId<Settings> | null> {
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
    filters: Partial<Record<keyof Settings, Condition<Settings>>>,
    updates: Partial<Settings>,
  ): Promise<WithId<Settings> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      { $set: updates },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  transformData(data: WithId<Settings>): WithId<SettingsDto> {
    const transformedData = {
      ...R.omit(SettingsDao.fieldHideList, data),
      _id: data._id,
      'GeneralSetting.WABusinessAccountId':
        data.GeneralSetting?.WABusinessAccountId || null,
      'GeneralSetting.StripeSubscriptionId':
        data.GeneralSetting?.StripeSubscriptionId || null,
      'GeneralSetting.StripeCustomerId':
        data.GeneralSetting?.StripeCustomerId || null,
    };

    return transformedData;
  }
}
