/* eslint-disable */
// @ts-nocheck
import { Paginated, Paginator } from '@/types/Pagination';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model, SortOrder } from 'mongoose';
import * as R from 'ramda';
import {
  FeatureAccessControl,
  featureAccessControlSchema,
  FeatureAccessControlDto,
} from './models/FeatureAccessControl';
import { BatchUpdateResult, IDao } from './_types/IDao';
import { Role } from '@/enums/Role';

export class FeatureAccessControlDao
  implements IDao<FeatureAccessControl, FeatureAccessControlDto>
{
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<FeatureAccessControl>> {
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models
        .FeatureAccessControl as Model<FeatureAccessControl>) ??
      mongooseConnection.model(
        'FeatureAccessControl',
        featureAccessControlSchema,
      );

    return model;
  }

  async insertMany(
    featureAccessControl: Partial<FeatureAccessControl>[],
  ): Promise<void> {
    const model = await this.initModel();
    const featureAccessControlCreateManyResponse = await model.insertMany(
      featureAccessControl,
      { runValidators: true },
    );
    const insertedId = featureAccessControlCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('featureAccessControl_not_created');
    }
  }
  async isRoleAvailable(role: string): Promise<boolean> {
    const model = await this.initModel();
    const count = await model.countDocuments({ role });

    return count > 0;
  }

  async get(id: string): Promise<WithId<FeatureAccessControlDto> | null> {
    const model = await this.initModel();
    const FeatureAccessControl = await model.findById(
      id,
      {},
      { runValidators: true },
    );

    return FeatureAccessControl
      ? {
          ...this.transformData(FeatureAccessControl),
          _id: new ObjectId(id),
        }
      : null;
  }
  async getAll(): Promise<WithId<FeatureAccessControlDto> | null>[] {
    console.log('in the fet all');
    const model = await this.initModel();
    const FeatureAccessControl = await model.find(
      {},
      {},
      { runValidators: true },
    );
    console.log('featurefdssdfkj', FeatureAccessControl);
    return featureAccessControls.length > 0
      ? featureAccessControls.map((doc) => ({
          ...this.transformData(doc),
          _id: new ObjectId(doc._id),
        }))
      : null;
  }

  async getOrAddRole(
    role: string,
  ): Promise<WithId<FeatureAccessControlDto> | null> {
    const model = await this.initModel();
    if (!Object.values(Role).includes(role as Role)) {
      throw new Error('Role not found in the Role enum');
    }
    let featureAccessControl = await model.findOne(
      { role },
      {},
      { runValidators: true },
    );
    if (!featureAccessControl) {
      featureAccessControl = await model.create({ role, features: [] });
    }

    return featureAccessControl
      ? {
          ...this.transformData(featureAccessControl),
        }
      : null;
  }
  async getByRole(
    role: string,
  ): Promise<WithId<FeatureAccessControlDto> | null> {
    const model = await this.initModel();
    let featureAccessControl = await model.findOne(
      { role },
      {},
      { runValidators: true },
    );
    console.log('featureAccessssss', featureAccessControl);
    return featureAccessControl
      ? {
          ...this.transformData(featureAccessControl),
        }
      : null;
  }

  async updateByRole(
    role: string,
    features: FeatureAccessControl['features'],
  ): Promise<void> {
    const model = await this.initModel();
    // const sanitizedFeatures = features.map(feature => {
    //   const { _id, ...rest } = feature;
    //   return rest;
    // });
    console.log('featiresss', features);
    const updateDoc = await model.findOneAndUpdate(
      { role },
      { $set: { features } },
      { runValidators: true, new: true },
    );

    if (!updateDoc) {
      throw new Error('not_updated');
    }
  }

  async count(
    filter?: Partial<
      Record<keyof FeatureAccessControl, Condition<FeatureAccessControl>>
    >,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<
      Record<keyof FeatureAccessControl, Condition<FeatureAccessControl>>
    >,
    sortBy?:
      | keyof FeatureAccessControl
      | Partial<{
          [key in keyof FeatureAccessControl]:
            | SortOrder
            | { $meta: 'textScore' };
        }>
      | [keyof FeatureAccessControl, SortOrder][],
  ): Promise<Paginated<WithId<FeatureAccessControlDto>>> {
    const model = await this.initModel();
    const [FeatureAccessControl, count] = await (async (): Promise<
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
      data: FeatureAccessControl.slice(0, limit)
        .map((featureAccessControl) =>
          featureAccessControl.toJSON({ flattenMaps: false }),
        )
        .map(this.transformData),
      paginator: { skip, limit },
      hasNext: FeatureAccessControl.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof FeatureAccessControl,
    value: unknown,
  ): Promise<FeatureAccessControl> {
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

  transformData(
    data: WithId<FeatureAccessControl>,
  ): WithId<FeatureAccessControlDto> {
    const transformedData = {
      ...R.omit(FeatureAccessControlDao.fieldHideList, data),
    };

    return transformedData;
  }
}
