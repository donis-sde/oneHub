import { WithId } from 'mongodb';
import { Connection, Model } from 'mongoose';
import * as R from 'ramda';
import {
  CloudApiSetupProcess,
  cloudApiSetupProcessSchema,
  CloudApiSetupProcessDto,
} from './models/CloudApiSetupProcess';

export class CloudApiSetupProcessDao {
  static fieldHideList = ['__v'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
  ) {}

  async initModel(): Promise<Model<CloudApiSetupProcess>> {
    const db = this.mongooseConnection.useDb(this.database);
    return (
      (db.models.CloudApiSetupProcess as Model<CloudApiSetupProcess>) ??
      db.model('CloudApiSetupProcess', cloudApiSetupProcessSchema)
    );
  }

  async getLatestByTenantId(
    tenantId: string,
  ): Promise<WithId<CloudApiSetupProcessDto> | null> {
    const model = await this.initModel();
    const doc = await model
      .findOne({ TenantId: tenantId })
      .sort({ LastUpdated: -1 })
      .exec();

    return doc ? this.transformData(doc) : null;
  }

  async getAllByTenantId(
    tenantId: string,
  ): Promise<WithId<CloudApiSetupProcessDto>[]> {
    const model = await this.initModel();
    const docs = await model
      .find({ TenantId: tenantId })
      .sort({ LastUpdated: -1 })
      .exec();

    return docs.map((doc) => this.transformData(doc));
  }

  async getById(id: string): Promise<WithId<CloudApiSetupProcessDto> | null> {
    const model = await this.initModel();
    const doc = await model.findById(id).exec();

    return doc ? this.transformData(doc) : null;
  }

  transformData(
    data: WithId<CloudApiSetupProcess>,
  ): WithId<CloudApiSetupProcessDto> {
    return {
      ...R.omit(CloudApiSetupProcessDao.fieldHideList, data),
      _id: data._id,
    };
  }
}
