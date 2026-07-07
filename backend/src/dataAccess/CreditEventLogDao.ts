/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  CreditEventLog,
  creditEventLogSchema,
  CreditEventLogDto,
} from './models/CreditEventLog';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class CreditEventLogDao
  implements IDao<CreditEventLog, CreditEventLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CreditEventLog>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.CreditEventLog as Model<CreditEventLog>) ??
      mongooseConnection.model('CreditEventLog', creditEventLogSchema);

    return model;
  }

  async insertMany(eventLogs: Partial<CreditEventLog>[]): Promise<void> {
    const model = await this.initModel();

    const eventLogsCreateManyResponse = await model.insertMany(eventLogs);
    const insertedId = eventLogsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('event_logs_not_created');
    }
  }

  async get(id: string): Promise<WithId<CreditEventLogDto> | null> {
    const model = await this.initModel();
    const eventLog = await model.findById(id, {}, { runValidators: true });

    return eventLog
      ? {
          ...this.transformData(eventLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
    sortBy?:
      | keyof CreditEventLog
      | Partial<{
          [key in keyof CreditEventLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof CreditEventLog, SortOrder][],
  ): Promise<Paginated<WithId<CreditEventLogDto>>> {
    const model = await this.initModel();
    const [eventLogs, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { CreatedAt: -1 }),
          model.countDocuments(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { CreatedAt: -1 }),
          model.countDocuments(),
        ]);
      }
    })();

    return {
      data: eventLogs
        .slice(0, limit)
        .map((eventLog) => eventLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: eventLogs.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof CreditEventLog,
    value: unknown,
  ): Promise<CreditEventLog> {
    const model = await this.initModel();

    const updateDoc = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { [field]: value, UpdatedAt: new Date() } },
      { runValidators: true, new: true },
    );

    if (!updateDoc) {
      throw new Error('not_updated');
    }

    return updateDoc;
  }

  async updateByFilter(
    filters: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
    field: keyof CreditEventLog,
    value: unknown,
    unset = false,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateMany(
      filters,
      unset
        ? {
            $unset: { [field]: value },
            $set: { UpdatedAt: new Date() },
          }
        : {
            $set: { [field]: value, UpdatedAt: new Date() },
          },
      { runValidators: true },
    );

    return {
      matchedCount: result.matchedCount,
      updatedCount: result.modifiedCount,
    };
  }

  async findAndUpdateOne(
    filters: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
    field: keyof CreditEventLog,
    value: unknown,
    unset = false,
  ): Promise<WithId<CreditEventLog> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      unset
        ? {
            $unset: { [field]: value },
            $set: { UpdatedAt: new Date() },
          }
        : {
            $set: { [field]: value, UpdatedAt: new Date() },
          },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  async findAndUpdateOneMultiple(
    filters: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
    updates: Partial<CreditEventLog>,
  ): Promise<WithId<CreditEventLog> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      { $set: { ...updates, UpdatedAt: new Date() } },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  transformData(data: WithId<CreditEventLog>): WithId<CreditEventLogDto> {
    const transformedData = {
      ...R.omit(CreditEventLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }

  async getByFilter(
    filter: Partial<Record<keyof CreditEventLog, Condition<CreditEventLog>>>,
  ): Promise<WithId<CreditEventLogDto>[] | null> {
    const model = await this.initModel();
    const eventLogs = await model.find(filter, {}, { runValidators: true });

    return eventLogs ? eventLogs.map(this.transformData) : null;
  }
}
