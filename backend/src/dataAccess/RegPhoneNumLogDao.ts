/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { IDao } from './_types/IDao';
import {
  RegPhoneNumLog,
  RegPhoneNumLogDto,
  regPhoneNumLogSchema,
} from '@/dataAccess/models/RegPhoneNumLog';

export class RegPhoneNumLogDao
  implements IDao<RegPhoneNumLog, RegPhoneNumLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<RegPhoneNumLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.RegPhoneNumLog as Model<RegPhoneNumLog>) ??
      db.model('RegPhoneNumLog', regPhoneNumLogSchema)
    );
  }

  async insertMany(rows: Partial<RegPhoneNumLog>[]): Promise<void> {
    const model = await this.initModel();
    const res = await model.insertMany(rows);
    if (!res?.length) {
      throw new Error('regPhoneNumLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<RegPhoneNumLogDto> | null> {
    const model = await this.initModel();
    const regPhoneNumLog = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return regPhoneNumLog
      ? {
          ...this.transformData(regPhoneNumLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof RegPhoneNumLog, Condition<RegPhoneNumLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.countDocuments(filter ?? {});
    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof RegPhoneNumLog, Condition<RegPhoneNumLog>>>,
    sortBy?:
      | keyof RegPhoneNumLog
      | Partial<{
          [key in keyof RegPhoneNumLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof RegPhoneNumLog, SortOrder][],
  ): Promise<Paginated<WithId<RegPhoneNumLogDto>>> {
    const model = await this.initModel();
    const [regPhoneNumLogs, count] = await (async (): Promise<
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
    console.log('regPhoneNumLogs', regPhoneNumLogs);
    return {
      data: regPhoneNumLogs
        .slice(0, limit)
        .map((RegPhoneNumLog) => RegPhoneNumLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: regPhoneNumLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<RegPhoneNumLog>): WithId<RegPhoneNumLogDto> {
    const transformedData = {
      ...R.omit(RegPhoneNumLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
