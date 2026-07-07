/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  TableAccessSetting,
  tableAccessSettingSchema,
  TableAccessSettingDto,
} from './models/TableAccessSetting';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class TableSettingDao
  implements IDao<TableAccessSetting, TableAccessSettingDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<TableAccessSetting>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .TableAccessSetting as Model<TableAccessSetting>) ??
      mongooseConnection.model('TableAccessSetting', tableAccessSettingSchema);

    return model;
  }

  async insertMany(
    tableAccessSettings: Partial<TableAccessSetting>[],
  ): Promise<WithId<TableAccessSettingDto>[]> {
    const model = await this.initModel();

    const tableAccessSettingsCreateManyResponse = await model.insertMany(
      tableAccessSettings,
    );
    const tableSettings =
      tableAccessSettingsCreateManyResponse as WithId<TableAccessSettings>[];
    if (tableSettings === undefined || tableSettings.length === 0) {
      throw new Error('tableAccessSettings_not_created');
    }

    return tableSettings
      .slice()
      .map((tas) => tas.toJSON({ flattenMaps: false }))
      .map(this.transformData);
  }

  async get(id: string): Promise<WithId<TableAccessSettingDto> | null> {
    const model = await this.initModel();
    const tableAccessSetting = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return tableAccessSetting
      ? {
          ...this.transformData(tableAccessSetting),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
    >,
    sortBy?:
      | keyof TableAccessSetting
      | Partial<{ [key in keyof TableAccessSetting]: SortOrder }>
      | [keyof TableAccessSetting, SortOrder][],
  ): Promise<Paginated<WithId<TableAccessSettingDto>>> {
    const model = await this.initModel();
    const [tableAccessSettings, count] = await (async (): Promise<
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
      data: tableAccessSettings
        .slice(0, limit)
        .map((tableAccessSetting) =>
          tableAccessSetting.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: tableAccessSettings.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof TableAccessSetting,
    value: unknown,
  ): Promise<TableAccessSetting> {
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
    field: keyof TableAccessSetting,
  ): Promise<TableAccessSetting> {
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
      Record<keyof TableAccessSetting, Condition<TableAccessSetting>>
    >,
    field: keyof TableAccessSetting,
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
    data: WithId<TableAccessSetting>,
  ): WithId<TableAccessSettingDto> {
    const transformedData = {
      ...R.omit(TableSettingDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
