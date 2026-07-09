/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import { IDao } from './_types/IDao';
import {
  RemoveCreditLineLog,
  RemoveCreditLineLogDto,
  removeCreditLineLogSchema,
} from '@/dataAccess/models/RemoveCreditLineLog';

export class RemoveCreditLineLogDao
  implements IDao<RemoveCreditLineLog, RemoveCreditLineLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<RemoveCreditLineLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.RemoveCreditLineLog as Model<RemoveCreditLineLog>) ??
      db.model('RemoveCreditLineLog', removeCreditLineLogSchema)
    );
  }

  async insertMany(rows: Partial<RemoveCreditLineLog>[]): Promise<void> {
    const model = await this.initModel();
    const res = await model.insertMany(rows);
    if (!res?.length) {
      throw new Error('removeCreditLineLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<RemoveCreditLineLogDto> | null> {
    const model = await this.initModel();
    const removeCreditLineLog = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return removeCreditLineLog
      ? {
          ...this.transformData(removeCreditLineLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof RemoveCreditLineLog, Condition<RemoveCreditLineLog>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.countDocuments(filter ?? {});
    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof RemoveCreditLineLog, Condition<RemoveCreditLineLog>>
    >,
    sortBy?:
      | keyof RemoveCreditLineLog
      | Partial<{
          [key in keyof RemoveCreditLineLog]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof RemoveCreditLineLog, SortOrder][],
  ): Promise<Paginated<WithId<RemoveCreditLineLogDto>>> {
    const model = await this.initModel();
    const [removeCreditLineLogs, count] = await (async (): Promise<
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
    console.log('removeCreditLineLogs', removeCreditLineLogs);
    return {
      data: removeCreditLineLogs
        .slice(0, limit)
        .map((RemoveCreditLineLog) =>
          RemoveCreditLineLog.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: removeCreditLineLogs.length === limit + 1,
      count,
    };
  }

  transformData(
    data: WithId<RemoveCreditLineLog>,
  ): WithId<RemoveCreditLineLogDto> {
    const transformedData = {
      ...R.omit(RemoveCreditLineLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
