/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { IDao } from './_types/IDao';
import {
  GetBmidLog,
  GetBmidLogDto,
  getBmidLogSchema,
} from '@/dataAccess/models/GetBmidLog';

export class GetBmidLogDao implements IDao<GetBmidLog, GetBmidLogDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<GetBmidLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.GetBmidLog as Model<GetBmidLog>) ??
      db.model('GetBmidLog', getBmidLogSchema)
    );
  }

  async insertMany(rows: Partial<GetBmidLog>[]): Promise<void> {
    const model = await this.initModel();
    const res = await model.insertMany(rows);
    if (!res?.length) {
      throw new Error('getBmidLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<GetBmidLogDto> | null> {
    const model = await this.initModel();
    const getBmidLog = await model.findById(id, {}, { runValidators: true });

    return getBmidLog
      ? {
          ...this.transformData(getBmidLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof GetBmidLog, Condition<GetBmidLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.countDocuments(filter ?? {});
    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof GetBmidLog, Condition<GetBmidLog>>>,
    sortBy?:
      | keyof GetBmidLog
      | Partial<{
          [key in keyof GetBmidLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof GetBmidLog, SortOrder][],
  ): Promise<Paginated<WithId<GetBmidLogDto>>> {
    const model = await this.initModel();
    const [getBmidLogs, count] = await (async (): Promise<
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
    console.log('getBmidLogs', getBmidLogs);
    return {
      data: getBmidLogs
        .slice(0, limit)
        .map((GetBmidLog) => GetBmidLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: getBmidLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<GetBmidLog>): WithId<GetBmidLogDto> {
    const transformedData = {
      ...R.omit(GetBmidLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
