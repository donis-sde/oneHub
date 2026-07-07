/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { IDao } from './_types/IDao';
import {
  GetPhoneNumLog,
  GetPhoneNumLogDto,
  getPhoneNumLogSchema,
} from '@/dataAccess/models/GetPhoneNumLog';

export class GetPhoneNumLogDao
  implements IDao<GetPhoneNumLog, GetPhoneNumLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<GetPhoneNumLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.GetPhoneNumLog as Model<GetPhoneNumLog>) ??
      db.model('GetPhoneNumLog', getPhoneNumLogSchema)
    );
  }

  async insertMany(rows: Partial<GetPhoneNumLog>[]): Promise<void> {
    const model = await this.initModel();
    const res = await model.insertMany(rows);
    if (!res?.length) {
      throw new Error('getPhoneNumLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<GetPhoneNumLogDto> | null> {
    const model = await this.initModel();
    const getPhoneNumLog = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return getPhoneNumLog
      ? {
          ...this.transformData(getPhoneNumLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof GetPhoneNumLog, Condition<GetPhoneNumLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.countDocuments(filter ?? {});
    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof GetPhoneNumLog, Condition<GetPhoneNumLog>>>,
    sortBy?:
      | keyof GetPhoneNumLog
      | Partial<{
          [key in keyof GetPhoneNumLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof GetPhoneNumLog, SortOrder][],
  ): Promise<Paginated<WithId<GetPhoneNumLogDto>>> {
    const model = await this.initModel();
    const [getPhoneNumLogs, count] = await (async (): Promise<
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
    console.log('getPhoneNumLogs', getPhoneNumLogs);
    return {
      data: getPhoneNumLogs
        .slice(0, limit)
        .map((GetPhoneNumLog) => GetPhoneNumLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: getPhoneNumLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<GetPhoneNumLog>): WithId<GetPhoneNumLogDto> {
    const transformedData = {
      ...R.omit(GetPhoneNumLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
