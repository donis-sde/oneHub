/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import { WatiStates, watiStatesSchema } from './models/WatiStates';
import * as R from 'ramda';

export class WatiStatesDao implements IDao<WatiStates, WatiStates> {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<WatiStates>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.WatiStates as Model<WatiStates>) ??
      mongooseConnection.model('WatiStates', watiStatesSchema);

    return model;
  }

  async count(
    filter?: Partial<Record<keyof WatiStates, Condition<WatiStates>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof WatiStates, Condition<WatiStates>>>,
    sortBy?:
      | keyof WatiStates
      | Partial<{ [key in keyof WatiStates]: SortOrder }>
      | [keyof WatiStates, SortOrder][],
  ): Promise<Paginated<WithId<WatiStates>>> {
    const model = await this.initModel();

    const [watiStates, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { Created: -1 }),
          model.countDocuments(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1)
            .sort(sortBy ?? { Created: -1 }),
          model.countDocuments(),
        ]);
      }
    })();

    return {
      data: watiStates
        .slice(0, limit)
        .map((watiState) => watiState.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: watiStates.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<WatiStates>): WithId<WatiStates> {
    const transformedData = {
      ...R.omit(WatiStatesDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }
}
