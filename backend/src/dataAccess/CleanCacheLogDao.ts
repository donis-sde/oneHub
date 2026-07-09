/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  CleanCacheLog,
  cleanCacheLogSchema,
  CleanCacheLogDto,
} from './models/CleanCacheLog';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class CleanCacheLogDao implements IDao<CleanCacheLog, CleanCacheLogDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CleanCacheLog>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.CleanCacheLog as Model<CleanCacheLog>) ??
      mongooseConnection.model('CleanCacheLog', cleanCacheLogSchema);

    return model;
  }

  async insertMany(CleanCacheLog: Partial<CleanCacheLog>[]): Promise<void> {
    const model = await this.initModel();
    const cleanCacheLogCreateManyResponse = await model.insertMany(
      CleanCacheLog,
    );
    const insertedId = cleanCacheLogCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('cleanCacheLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<CleanCacheLogDto> | null> {
    const model = await this.initModel();
    const cleanCacheLog = await model.findById(id, {}, { runValidators: true });

    return cleanCacheLog
      ? {
          ...this.transformData(cleanCacheLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof CleanCacheLog, Condition<CleanCacheLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof CleanCacheLog, Condition<CleanCacheLog>>>,
    sortBy?:
      | keyof CleanCacheLog
      | Partial<{
          [key in keyof CleanCacheLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof CleanCacheLog, SortOrder][],
  ): Promise<Paginated<WithId<CleanCacheLogDto>>> {
    const model = await this.initModel();
    const [cleanCacheLogs, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { operationTimestamp: 'desc' }),
          model.countDocuments(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { operationTimestamp: 'desc' }),
          model.countDocuments(),
        ]);
      }
    })();
    console.log('cleanCacheLogs', cleanCacheLogs);
    return {
      data: cleanCacheLogs
        .slice(0, limit)
        .map((CleanCacheLog) => CleanCacheLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: cleanCacheLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<CleanCacheLog>): WithId<CleanCacheLogDto> {
    const transformedData = {
      ...R.omit(CleanCacheLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
