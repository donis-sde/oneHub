/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  TerminateSubscriptionLog,
  terminateSubscriptionLogSchema,
  TerminateSubscriptionLogDto,
} from './models/TerminateSubscriptionLog';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class TerminateSubscriptionLogDao
  implements IDao<TerminateSubscriptionLog, TerminateSubscriptionLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<TerminateSubscriptionLog>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .TerminateSubscriptionLog as Model<TerminateSubscriptionLog>) ??
      mongooseConnection.model(
        'TerminateSubscriptionLog',
        terminateSubscriptionLogSchema,
      );

    return model;
  }

  async insertMany(
    terminateSubscriptionLog: Partial<TerminateSubscriptionLog>[],
  ): Promise<void> {
    const model = await this.initModel();
    const logCreateManyResponse = await model.insertMany(
      terminateSubscriptionLog,
    );
    const insertedId = logCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('terminateSubscriptionLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<TerminateSubscriptionLogDto> | null> {
    const model = await this.initModel();
    const terminateSubscriptionLog = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return terminateSubscriptionLog
      ? {
          ...this.transformData(terminateSubscriptionLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<
        keyof TerminateSubscriptionLog,
        Condition<TerminateSubscriptionLog>
      >
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<
        keyof TerminateSubscriptionLog,
        Condition<TerminateSubscriptionLog>
      >
    >,
    sortBy?:
      | keyof TerminateSubscriptionLog
      | Partial<{
          [key in keyof TerminateSubscriptionLog]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof TerminateSubscriptionLog, SortOrder][],
  ): Promise<Paginated<WithId<TerminateSubscriptionLogDto>>> {
    console.log('sortBy', sortBy);
    const model = await this.initModel();
    const [terminateSubscriptionLogs, count] = await (async (): Promise<
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

    return {
      data: terminateSubscriptionLogs
        .slice(0, limit)
        .map((CreateUserLog) => CreateUserLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: terminateSubscriptionLogs.length === limit + 1,
      count,
    };
  }

  transformData(
    data: WithId<TerminateSubscriptionLog>,
  ): WithId<TerminateSubscriptionLogDto> {
    const transformedData = {
      ...R.omit(TerminateSubscriptionLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
