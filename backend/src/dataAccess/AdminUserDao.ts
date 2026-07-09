import { Role } from '@/enums/Role';
import { Paginated, Paginator } from '@/types/Pagination';
import { hash } from '@/utils/passwordUtil';
import { ObjectId, WithId } from 'mongodb';
import { Condition, Connection, Document, Model } from 'mongoose';
import * as R from 'ramda';
import {
  AdminUser,
  AdminUserQueryDto,
  adminUserSchema,
  AdminUserDto,
} from './models/AdminUser';
import { BatchUpdateResult, IDao } from './_types/IDao';
import winston from 'winston';

export class AdminUserDao implements IDao<AdminUser, AdminUserDto> {
  static fieldHideList = ['__v', 'passwordHash', 'salt'] as const;

  constructor(
    private readonly mongooseConnection: Connection,
    public readonly database: string,
    public readonly collection: string,
    private readonly logger: winston.Logger,
  ) {}

  async initModel(): Promise<Model<AdminUser>> {
    this.logger.debug('this.database', this.database);
    const mongooseConnection = this.mongooseConnection.useDb(this.database);
    const model =
      (mongooseConnection.models.AdminUsers as Model<AdminUser>) ??
      mongooseConnection.model('adminUsers', adminUserSchema);

    return model;
  }

  async createAdminUser({
    email,
    password,
  }: AdminUserQueryDto): Promise<{ _id: ObjectId }> {
    const model = await this.initModel();

    this.logger.debug('init model finished');

    const { salt, passwordHash } = await hash(password);

    const adminUserCreateResponse = await model.collection.insertOne({
      email,
      passwordHash,
      salt,
      role: Role.UNVERIFIED,
    });
    const insertedId = adminUserCreateResponse?.insertedId ?? null;
    this.logger.debug('inserted id', { insertedId });

    if (!insertedId) {
      throw new Error('admin_user_not_created');
    }

    return { _id: insertedId };
  }

  async queryAdminUserByEmailAndPassword(
    adminUserQueryDto: AdminUserQueryDto,
  ): Promise<WithId<AdminUser> | null> {
    const model = await this.initModel();

    const adminUserFromEmail = await model.findOne({
      email: adminUserQueryDto.email,
    });

    if (!adminUserFromEmail) {
      return null;
    }
    const { passwordHash } = await hash(
      adminUserQueryDto.password,
      adminUserFromEmail.salt,
    );

    if (adminUserFromEmail.passwordHash === passwordHash) {
      return adminUserFromEmail?.toJSON({ flattenMaps: false });
    } else {
      return null;
    }
  }

  async get(id: string): Promise<WithId<AdminUserDto> | null> {
    const model = await this.initModel();
    const adminUser = await model.findById(id, {}, { runValidators: true });

    return adminUser
      ? {
          ...this.transformData(adminUser),
          _id: new ObjectId(id),
        }
      : null;
  }

  async count(
    filter?: Partial<Record<keyof AdminUser, Condition<AdminUser>>>,
  ): Promise<number> {
    const model = await this.initModel();
    const num = await model.count(filter);

    return num;
  }

  async insertMany(adminUsers: Partial<AdminUser>[]): Promise<void> {
    const model = await this.initModel();

    const adminUsersCreateManyResponse = await model.insertMany(adminUsers);
    const insertedId = adminUsersCreateManyResponse[0]?._id ?? null;

    if (!insertedId) {
      throw new Error('adminUsers_not_created');
    }
  }

  async list(
    { skip, limit }: Paginator,
    filter?: Partial<Record<keyof AdminUser, Condition<AdminUser>>>,
  ): Promise<Paginated<WithId<AdminUserDto>>> {
    const model = await this.initModel();
    const [adminUsers, count] = await (async (): Promise<
      [Document[], number]
    > => {
      if (filter) {
        return Promise.all([
          model
            .find(filter, {})
            .skip(skip)
            .limit(limit + 1),
          model.count(filter),
        ]);
      } else {
        return Promise.all([
          model
            .find()
            .skip(skip)
            .limit(limit + 1),
          model.count(),
        ]);
      }
    })();

    return {
      data: adminUsers
        .slice(0, limit)
        .map((adminUser) => adminUser.toJSON({ flattenMaps: false }))
        .map(this.transformData),
      paginator: {
        skip,
        limit,
      },
      hasNext: adminUsers.length === limit + 1,
      count,
    };
  }

  async updateField(
    id: string,
    field: keyof AdminUser,
    value: unknown,
  ): Promise<AdminUser> {
    const model = await this.initModel();

    const updatedAdminUser = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { [field]: value } },
      { runValidators: true, new: true },
    );

    if (!updatedAdminUser) {
      throw new Error('not_updated');
    }

    return updatedAdminUser;
  }

  async deleteField(id: string, field: keyof AdminUser): Promise<AdminUser> {
    const model = await this.initModel();

    const updatedAdminUser = await model.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $unset: { [field]: '' } },
      { runValidators: true, new: true },
    );

    if (!updatedAdminUser) {
      throw new Error('not_updated');
    }

    return updatedAdminUser;
  }

  transformData(data: WithId<AdminUser>): WithId<AdminUserDto> {
    // retain _id as mongodb indentifier
    const transformedData = {
      ...R.omit(AdminUserDao.fieldHideList, data),
      _id: data._id,
    };

    return transformedData;
  }

  async updateByFilter(
    filters: Partial<Record<keyof AdminUser, Condition<AdminUser>>>,
    field: keyof AdminUser,
    value: unknown,
    unset = false,
  ): Promise<BatchUpdateResult> {
    const model = await this.initModel();
    const result = await model.updateMany(
      filters,
      unset
        ? {
            $unset: { [field]: value },
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
}
