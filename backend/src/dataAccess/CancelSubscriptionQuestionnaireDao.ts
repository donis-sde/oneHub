/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  CancelSubscriptionQuestionnaire,
  cancelSubscriptionQuestionnaireSchema,
  CancelSubscriptionQuestionnaireDto,
} from './models/CancelSubscriptionQuestionnaire';
import { BatchUpdateResult, IDao } from './_types/IDao';

export class CancelSubscriptionQuestionnaireDao
  implements
    IDao<CancelSubscriptionQuestionnaire, CancelSubscriptionQuestionnaireDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CancelSubscriptionQuestionnaire>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .CancelSubscriptionQuestionnaire as Model<CancelSubscriptionQuestionnaire>) ??
      mongooseConnection.model(
        'CancelSubscriptionQuestionnaire',
        cancelSubscriptionQuestionnaireSchema,
      );

    return model;
  }

  async insertMany(
    questionnaires: Partial<CancelSubscriptionQuestionnaire>[],
  ): Promise<void> {
    const model = await this.initModel();

    const questionnairesCreateManyResponse = await model.insertMany(
      questionnaires,
    );
    const insertedId = questionnairesCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('questionnaires_not_created');
    }
  }

  async get(
    id: string,
  ): Promise<WithId<CancelSubscriptionQuestionnaireDto> | null> {
    const model = await this.initModel();
    const questionnaire = await model.findById(id, {}, { runValidators: true });

    return questionnaire
      ? {
          ...this.transformData(questionnaire),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<
      Record<
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
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
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
      >
    >,
    sortBy?:
      | keyof CancelSubscriptionQuestionnaire
      | Partial<{
          [key in keyof CancelSubscriptionQuestionnaire]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof CancelSubscriptionQuestionnaire, SortOrder][],
  ): Promise<Paginated<WithId<CancelSubscriptionQuestionnaireDto>>> {
    const model = await this.initModel();
    const [questionnaires, count] = await (async (): Promise<
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
      data: questionnaires
        .slice(0, limit)
        .map((questionnaire) => questionnaire.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: questionnaires.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof CancelSubscriptionQuestionnaire,
    value: unknown,
  ): Promise<CancelSubscriptionQuestionnaire> {
    const model = await this.initModel();

    const updateDoc = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { [field]: value } },
      { runValidators: true, new: true },
    );

    if (!updateDoc) {
      throw new Error('not_updated');
    }

    return updateDoc;
  }

  async updateByFilter(
    filters: Partial<
      Record<
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
      >
    >,
    field: keyof CancelSubscriptionQuestionnaire,
    value: unknown,
    unset = false,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateMany(
      filters,
      unset
        ? {
            $unset: { [field]: value },
            $set: {},
          }
        : {
            $set: { [field]: value },
          },
      { runValidators: true },
    );

    return {
      matchedCount: result.matchedCount,
      updatedCount: result.modifiedCount,
    };
  }

  async findAndUpdateOne(
    filters: Partial<
      Record<
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
      >
    >,
    field: keyof CancelSubscriptionQuestionnaire,
    value: unknown,
    unset = false,
  ): Promise<WithId<CancelSubscriptionQuestionnaire> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      unset
        ? {
            $unset: { [field]: value },
          }
        : {
            $set: { [field]: value },
          },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  async findAndUpdateOneMultiple(
    filters: Partial<
      Record<
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
      >
    >,
    updates: Partial<CancelSubscriptionQuestionnaire>,
  ): Promise<WithId<CancelSubscriptionQuestionnaire> | null> {
    const model = await this.initModel();
    const result = await model.findOneAndUpdate(
      filters,
      { $set: updates },
      { runValidators: true, new: true },
    );

    return result ? this.transformData(result) : null;
  }

  transformData(
    data: WithId<CancelSubscriptionQuestionnaire>,
  ): WithId<CancelSubscriptionQuestionnaireDto> {
    const transformedData = {
      ...R.omit(CancelSubscriptionQuestionnaireDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }

  async getByFilter(
    filter: Partial<
      Record<
        keyof CancelSubscriptionQuestionnaire,
        Condition<CancelSubscriptionQuestionnaire>
      >
    >,
  ): Promise<WithId<CancelSubscriptionQuestionnaireDto>[] | null> {
    const model = await this.initModel();
    const questionnaires = await model.find(
      filter,
      {},
      { runValidators: true },
    );

    return questionnaires ? questionnaires.map(this.transformData) : null;
  }
}
