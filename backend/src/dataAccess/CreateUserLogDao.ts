/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  CreateUserLog,
  createUserLogSchema,
  CreateUserLogDto,
} from './models/CreateUserLog';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class CreateUserLogDao implements IDao<CreateUserLog, CreateUserLogDto> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CreateUserLog>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.CreateUserLog as Model<CreateUserLog>) ??
      mongooseConnection.model('CreateUserLog', createUserLogSchema);

    return model;
  }

  async insertMany(CreateUserLog: Partial<CreateUserLog>[]): Promise<void> {
    const model = await this.initModel();
    const createUserLogCreateManyResponse = await model.insertMany(
      CreateUserLog,
    );
    const insertedId = createUserLogCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('createUserLog_not_created');
    }
  }

  async get(id: string): Promise<WithId<CreateUserLogDto> | null> {
    const model = await this.initModel();
    const CreateUserLog = await model.findById(id, {}, { runValidators: true });

    return CreateUserLog
      ? {
          ...this.transformData(CreateUserLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof CreateUserLog, Condition<CreateUserLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof CreateUserLog, Condition<CreateUserLog>>>,
    sortBy?:
      | keyof CreateUserLog
      | Partial<{
          [key in keyof CreateUserLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof CreateUserLog, SortOrder][],
  ): Promise<Paginated<WithId<CreateUserLogDto>>> {
    console.log('sortBy', sortBy);
    const model = await this.initModel();
    const [createUserLogs, count] = await (async (): Promise<
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
      data: createUserLogs
        .slice(0, limit)
        .map((CreateUserLog) => CreateUserLog.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: createUserLogs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<CreateUserLog>): WithId<CreateUserLogDto> {
    const transformedData = {
      ...R.omit(CreateUserLogDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
