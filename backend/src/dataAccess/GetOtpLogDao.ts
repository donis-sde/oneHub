/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { IDao } from './_types/IDao';
import {
  GetOtpLog,
  GetOtpLogDto,
  getOtpLogSchema,
} from '@/dataAccess/models/GetOtpLog';

export class GetOtpLogDao implements IDao<GetOtpLog, GetOtpLogDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<GetOtpLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.GetOtpLog as Model<GetOtpLog>) ??
      db.model('GetOtpLog', getOtpLogSchema)
    );
  }

  async insertMany(rows: Partial<GetOtpLog>[]): Promise<void> {
    const model = await this.initModel();
    const res = await model.insertMany(rows);
    if (!res?.length) {
      throw new Error('getOtpLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<GetOtpLogDto> | null> {
    const model = await this.initModel();
    const getOtpLog = await model.findById(id, {}, { runValidators: true });

    return getOtpLog
      ? {
          ...this.transformData(getOtpLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof GetOtpLog, Condition<GetOtpLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.countDocuments(filter ?? {});
    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof GetOtpLog, Condition<GetOtpLog>>>,
    sortBy?:
      | keyof GetOtpLog
      | Partial<{
          [key in keyof GetOtpLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof GetOtpLog, SortOrder][],
  ): Promise<Paginated<WithId<GetOtpLogDto>>> {
    const model = await this.initModel();
    const [getOtpLogs, count] = await (async (): Promise<
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
    console.log('getOtpLogs', getOtpLogs);
    return {
      data: getOtpLogs
        .slice(0, limit)
        .map((GetOtpLog) => GetOtpLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: getOtpLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<GetOtpLog>): WithId<GetOtpLogDto> {
    const transformedData = {
      ...R.omit(GetOtpLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
