/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  BackofficeDbUpdateLogs,
  backofficeDbUpdateLogsSchema,
  BackofficeDbUpdateLogsDto,
} from './models/BackofficeDbUpdateLogs';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class BackofficeDbUpdateLogsDao
  implements IDao<BackofficeDbUpdateLogs, BackofficeDbUpdateLogsDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<BackofficeDbUpdateLogs>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .BackofficeDbUpdateLogs as Model<BackofficeDbUpdateLogs>) ??
      mongooseConnection.model(
        'BackofficeDbUpdateLogs',
        backofficeDbUpdateLogsSchema,
      );

    return model;
  }

  async insertMany(
    backofficeDbUpdateLogs: Partial<BackofficeDbUpdateLogs>[],
  ): Promise<void> {
    const model = await this.initModel();
    const backofficeDbUpdateLogsCreateManyResponse = await model.insertMany(
      backofficeDbUpdateLogs,
    );
    const insertedId = backofficeDbUpdateLogsCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('backofficeDbUpdateLogs_not_created');
    }
  }

  async get(id: string): Promise<WithId<BackofficeDbUpdateLogsDto> | null> {
    const model = await this.initModel();
    const BackofficeDbUpdateLogs = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return BackofficeDbUpdateLogs
      ? {
          ...this.transformData(BackofficeDbUpdateLogs),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof BackofficeDbUpdateLogs, Condition<BackofficeDbUpdateLogs>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof BackofficeDbUpdateLogs, Condition<BackofficeDbUpdateLogs>>
    >,
    sortBy?:
      | keyof BackofficeDbUpdateLogs
      | Partial<{
          [key in keyof BackofficeDbUpdateLogs]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof BackofficeDbUpdateLogs, SortOrder][],
  ): Promise<Paginated<WithId<BackofficeDbUpdateLogsDto>>> {
    const model = await this.initModel();
    const [BackofficeDbUpdateLogs, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { timestamp: -1 }),
          model.countDocuments(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { timestamp: -1 }),
          model.countDocuments(),
        ]);
      }
    })();

    return {
      data: BackofficeDbUpdateLogs.slice(0, limit)
        .map((backofficeDbUpdateLogs) =>
          backofficeDbUpdateLogs.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: BackofficeDbUpdateLogs.length === limit + 1,
      count,
    };
  }

  //   async updateField(
  //     id: string,
  //     field: keyof Partner,
  //     value: unknown,
  //   ): Promise<Partner> {
  //     const model = await this.initModel();

  //     const updateDoc = await model.findOneAndUpdate(
  //       { _id: new ObjectId(id) },
  //       { $set: { [field]: value } },
  //       { runValidators: true, new: true },
  //     );

  //     if (!updateDoc) {
  //       throw new Error('not_updated');
  //     }

  //     return updateDoc;
  //   }

  //   async deleteField(id: string, field: keyof Partner): Promise<Partner> {
  //     const model = await this.initModel();

  //     const updateDoc = await model.findOneAndUpdate(
  //       { _id: new ObjectId(id) },
  //       { $unset: { [field]: '' } },
  //       { runValidators: true, new: true },
  //     );

  //     if (!updateDoc) {
  //       throw new Error('not_updated');
  //     }

  //     return updateDoc;
  //   }

  //   async updateByFilter(
  //     filters: Partial<Record<keyof Partner, Condition<Partner>>>,
  //     field: keyof Partner,
  //     value: unknown,
  //     unset = false,
  //   ): Promise<BatchUpdateResult> {
  //     const model = await this.initModel();
  //     const result = await model.updateMany(
  //       filters,
  //       unset
  //         ? {
  //             $unset: { [field]: value },
  //           }
  //         : {
  //             $set: { [field]: value },
  //           },
  //       { runValidators: true },
  //     );

  //     return {
  //       matchedCount: result.matchedCount,
  //       updatedCount: result.modifiedCount,
  //     };
  //   }

  transformData(
    data: WithId<BackofficeDbUpdateLogs>,
  ): WithId<BackofficeDbUpdateLogsDto> {
    const transformedData = {
      ...R.omit(BackofficeDbUpdateLogsDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
