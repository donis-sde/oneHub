import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  OnboardingFixLog,
  onboardingFixLogSchema,
  OnboardingFixLogDto,
} from './models/OnboardingFixLog';

export class OnboardingFixLogDao {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<OnboardingFixLog>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.OnboardingFixLog as Model<OnboardingFixLog>) ??
      db.model('OnboardingFixLog', onboardingFixLogSchema)
    );
  }

  async insertMany(logs: Partial<OnboardingFixLog>[]): Promise<void> {
    const model = await this.initModel();
    const result = await model.insertMany(logs);
    const insertedId = result[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('onboarding_fix_log_not_created');
    }
  }

  async get(id: string): Promise<WithId<OnboardingFixLogDto> | null> {
    const model = await this.initModel();
    const log = await model.findById(id, {}, { runValidators: true });

    return log
      ? {
          ...this.transformData(log),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<keyof OnboardingFixLog, Condition<OnboardingFixLog>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    return await model.countDocuments(filter);
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof OnboardingFixLog, Condition<OnboardingFixLog>>
    >,
    sortBy?:
      | keyof OnboardingFixLog
      | Partial<{
          [key in keyof OnboardingFixLog]: SortOrder | { $meta: 'textScore' };
        }>
      | [keyof OnboardingFixLog, SortOrder][],
  ): Promise<Paginated<WithId<OnboardingFixLogDto>>> {
    const model = await this.initModel();
    const [logs, count] = await (async (): Promise<[Document[], number]> => {
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
      data: logs
        .slice(0, limit)
        .map((log) => log.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: logs.length === limit + 1,
      count,
    };
  }

  transformData(data: WithId<OnboardingFixLog>): WithId<OnboardingFixLogDto> {
    return {
      ...R.omit(OnboardingFixLogDao.fieldHideList, data),
      _id: data._id,
    };
  }
}
