/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  ColumnAccessSetting,
  columnAccessSettingSchema,
  ColumnAccessSettingDto,
} from './models/ColumnAccessSetting';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class ColumnSettingDao
  implements IDao<ColumnAccessSetting, ColumnAccessSettingDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<ColumnAccessSetting>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .ColumnAccessSetting as Model<ColumnAccessSetting>) ??
      mongooseConnection.model(
        'ColumnAccessSetting',
        columnAccessSettingSchema,
      );

    return model;
  }

  async insertMany(
    columnAccessSettings: Partial<ColumnAccessSetting>[],
  ): Promise<WithId<ColumnAccessSettingDto>[]> {
    const model = await this.initModel();
    const columnAccessSettingsCreateManyResponse = await model.insertMany(
      columnAccessSettings,
    );
    const columnSettings =
      columnAccessSettingsCreateManyResponse as WithId<ColumnAccessSetting>[];
    if (columnSettings === undefined || columnSettings.length === 0) {
      throw new Error('columnsAccessSettings_not_created');
    }

    return columnSettings
      .slice()
      .map((tas) => tas.toJSON({ flattenMaps: false }))
      .map(this.transformData);
  }

  async get(id: string): Promise<WithId<ColumnAccessSettingDto> | null> {
    const model = await this.initModel();
    const columnAccessSetting = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return columnAccessSetting
      ? {
          ...this.transformData(columnAccessSetting),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
    >,
    sortBy?:
      | keyof ColumnAccessSetting
      | Partial<{ [key in keyof ColumnAccessSetting]: SortOrder }>
      | [keyof ColumnAccessSetting, SortOrder][],
  ): Promise<Paginated<WithId<ColumnAccessSettingDto>>> {
    const model = await this.initModel();
    const [columnAccessSettings, count] = await (async (): Promise<
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
      data: columnAccessSettings
        .slice(0, limit)
        .map((columnAccessSetting) =>
          columnAccessSetting.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: columnAccessSettings.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof ColumnAccessSetting,
    value: unknown,
  ): Promise<ColumnAccessSetting> {
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

  async deleteField(
    id: string,
    field: keyof ColumnAccessSetting,
  ): Promise<ColumnAccessSetting> {
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
    filters: Partial<
      Record<keyof ColumnAccessSetting, Condition<ColumnAccessSetting>>
    >,
    field: keyof ColumnAccessSetting,
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

  transformData(
    data: WithId<ColumnAccessSetting>,
  ): WithId<ColumnAccessSettingDto> {
    const transformedData = {
      ...R.omit(ColumnSettingDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
