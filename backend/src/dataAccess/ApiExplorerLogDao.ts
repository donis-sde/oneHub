/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  ApiExplorerLog,
  apiExplorerLogSchema,
  ApiExplorerLogDto,
} from './models/ApiExplorerLog';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class ApiExplorerLogDao
  implements IDao<ApiExplorerLog, ApiExplorerLogDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<ApiExplorerLog>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.ApiExplorerLog as Model<ApiExplorerLog>) ??
      mongooseConnection.model('ApiExplorerLog', apiExplorerLogSchema);

    return model;
  }

  async insertMany(apiExplorerLogs: Partial<ApiExplorerLog>[]): Promise<void> {
    const model = await this.initModel();
    const apiExplorerLogsCreateManyResponse = await model.insertMany(
      apiExplorerLogs,
    );
    const insertedId = apiExplorerLogsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('apiExplorerLogs_not_created');
    }
  }

  async get(id: string): Promise<WithId<ApiExplorerLogDto> | null> {
    const model = await this.initModel();
    const ApiExplorerLog = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return ApiExplorerLog
      ? {
          ...this.transformData(ApiExplorerLog),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof ApiExplorerLog, Condition<ApiExplorerLog>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof ApiExplorerLog, Condition<ApiExplorerLog>>>,
    sortBy?:
      | keyof ApiExplorerLog
      | Partial<{
          [key in keyof ApiExplorerLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof ApiExplorerLog, SortOrder][],
  ): Promise<Paginated<WithId<ApiExplorerLogDto>>> {
    const model = await this.initModel();
    const [ApiExplorerLog, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .sort(sortBy ?? { timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
          model.count(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find({}, {})
            .sort(sortBy ?? { timestamp: -1 })
            .skip(skip)
            .limit(limit)
            .lean()
            .exec(),
          model.count({}),
        ]);
      }
    })();

    return {
      data: ApiExplorerLog.map((item) => ({
        ...this.transformData(item),
        _id: new ObjectId(item._id),
      })),
      count,
    };
  }

  async batchUpdate(
    filter: Partial<Record<keyof ApiExplorerLog, Condition<ApiExplorerLog>>>,
    update: Partial<ApiExplorerLog>,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateMany(filter, update);

    return {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    };
  }

  async delete(id: string): Promise<void> {
    const model = await this.initModel();
    await model.findByIdAndDelete(id);
  }

  private transformData(data: Document): ApiExplorerLogDto {
    return R.omit(ApiExplorerLogDao.fieldHideList, data);
  }
}
