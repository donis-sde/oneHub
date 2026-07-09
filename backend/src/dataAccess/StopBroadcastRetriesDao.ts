/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  StopBroadcastRetries,
  stopBroadcastLogSchema,
  StopBroadcastRetriesDto,
} from './models/StopBroadcastRetries';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class StopBroadcastRetriesDao
  implements IDao<StopBroadcastRetries, StopBroadcastRetriesDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<StopBroadcastRetries>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .StopBroadcastRetries as Model<StopBroadcastRetries>) ??
      mongooseConnection.model('StopBroadcastRetries', stopBroadcastLogSchema);

    return model;
  }

  async insertMany(
    StopBroadcastRetries: Partial<StopBroadcastRetries>[],
  ): Promise<void> {
    const model = await this.initModel();
    const stopBroadcastRetriesCreateManyResponse = await model.insertMany(
      StopBroadcastRetries,
    );
    const insertedId = stopBroadcastRetriesCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('stopBroadcastRetries_not_created');
    }
  }

  async get(id: string): Promise<WithId<StopBroadcastRetriesDto> | null> {
    const model = await this.initModel();
    const stopBroadcastRetries = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return stopBroadcastRetries
      ? {
          ...this.transformData(stopBroadcastRetries),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof StopBroadcastRetries, Condition<StopBroadcastRetries>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof StopBroadcastRetries, Condition<StopBroadcastRetries>>
    >,
    sortBy?:
      | keyof StopBroadcastRetries
      | Partial<{
          [key in keyof StopBroadcastRetries]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof StopBroadcastRetries, SortOrder][],
  ): Promise<Paginated<WithId<StopBroadcastRetriesDto>>> {
    const model = await this.initModel();
    const [stopBroadcastRetries, count] = await (async (): Promise<
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
    console.log('stopBroadcastRetries', stopBroadcastRetries);
    return {
      data: stopBroadcastRetries
        .slice(0, limit)
        .map((StopBroadcastRetries) =>
          StopBroadcastRetries.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: stopBroadcastRetries.length === limit + 1,
      count,
    };
  }

  transformData(
    data: WithId<StopBroadcastRetries>,
  ): WithId<StopBroadcastRetriesDto> {
    const transformedData = {
      ...R.omit(StopBroadcastRetriesDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
