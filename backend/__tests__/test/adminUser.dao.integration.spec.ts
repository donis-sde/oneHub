import { getServerDiContainer } from '@/global/serverDiContainer';
import {
  MOCK_ADMIN_USER,
  MOCK_ADMIN_USER_2,
  MOCK_ADMIN_USER_3,
  MOCK_ADMIN_USER_CREATE_DTO_CREATE,
  MOCK_ADMIN_USER_LOGIN_DTO,
  MOCK_UNVERIFIED_ADMIN_USER,
} from '../seeds/mockAdminUsers';
import { AdminUserDao } from '@/dataAccess/AdminUserDao';
import { Connection } from 'mongoose';
import { QUERY_LIMIT } from '../constant';
import { Role } from '@/enums/Role';
import { MongoBulkWriteError } from 'mongodb';
import assert from 'assert';

describe('AdminUserDao Integration Test', () => {
  let mongooseConnection: Connection;
  let adminUserDao: AdminUserDao;
  const seedData = [MOCK_ADMIN_USER, MOCK_ADMIN_USER_2, MOCK_ADMIN_USER_3];
  beforeAll(async () => {
    const {
      mongooseConnection: _mongooseConnection,
      adminUserDao: _adminUserDao,
    } = await getServerDiContainer(global.__MONGO_URI__);
    mongooseConnection = _mongooseConnection;
    adminUserDao = _adminUserDao;

    await mongooseConnection
      .useDb(adminUserDao.database)
      .collection(adminUserDao.collection)
      .insertMany(seedData);
  });

  describe('list', () => {
    it('should list adminUsers', async () => {
      const paginatedAdminUsers = await adminUserDao.list({
        skip: 0,
        limit: seedData.length + 1,
      });
      expect(paginatedAdminUsers?.count).toBe(seedData.length);
      expect(paginatedAdminUsers?.data.length).toBe(seedData.length);
      expect(paginatedAdminUsers?.paginator.skip).toBe(0);
      expect(paginatedAdminUsers?.paginator.limit).toBe(seedData.length + 1);
    });

    it('should be able to return empty list when pagination end', async () => {
      const paginatedAdminUsers = await adminUserDao.list({
        skip: seedData.length + 1,
        limit: QUERY_LIMIT,
      });
      expect(paginatedAdminUsers?.count).toBe(seedData.length);
      expect(paginatedAdminUsers?.data.length).toBe(0);
    });

    it('should able to paginate', async () => {
      const limit = seedData.length - 1;
      const paginatedAdminUsers = await adminUserDao.list({
        skip: 0,
        limit,
      });
      expect(paginatedAdminUsers?.count).toBe(seedData.length);
      expect(paginatedAdminUsers?.data.length).toBe(limit);
      expect(paginatedAdminUsers?.paginator.skip).toBe(0);
      expect(paginatedAdminUsers?.paginator.limit).toBe(limit);

      const newSkip =
        paginatedAdminUsers.paginator?.skip +
        paginatedAdminUsers.paginator?.limit;
      const nextPaginatedAdminUsers = await adminUserDao.list({
        skip: newSkip,
        limit: paginatedAdminUsers.paginator?.limit,
      });
      expect(nextPaginatedAdminUsers?.count).toBe(seedData.length);
      expect(nextPaginatedAdminUsers?.data.length).toBe(
        seedData.length - limit > limit ? limit : seedData.length - limit,
      );
      expect(nextPaginatedAdminUsers?.paginator.skip).toBe(newSkip);
      expect(nextPaginatedAdminUsers?.paginator.limit).toBe(
        paginatedAdminUsers.paginator?.limit,
      );
    });
  });

  describe('queryAdminUserByEmailAndPassword', () => {
    it('should return adminUser', async () => {
      const adminUser = await adminUserDao.queryAdminUserByEmailAndPassword(
        MOCK_ADMIN_USER_LOGIN_DTO,
      );

      expect(adminUser?.email).toBe(MOCK_ADMIN_USER.email);
    });
  });

  describe('createAdminUser', () => {
    it('should be able to create admin user', async () => {
      const nonCreatedAdminUser = await mongooseConnection
        .useDb(adminUserDao.database)
        .collection(adminUserDao.collection)
        .findOne({
          email: MOCK_ADMIN_USER_CREATE_DTO_CREATE.email,
        });

      const createdAdminUser = await adminUserDao.createAdminUser(
        MOCK_ADMIN_USER_CREATE_DTO_CREATE,
      );

      const adminUser = await mongooseConnection
        .useDb(adminUserDao.database)
        .collection(adminUserDao.collection)
        .findOne({
          email: MOCK_ADMIN_USER_CREATE_DTO_CREATE.email,
        });

      expect(nonCreatedAdminUser).toBeNull();
      expect(adminUser?._id).toMatchObject(createdAdminUser._id);
    });

    it('should not be able to create admin user with same email twice', async () => {
      try {
        await adminUserDao.createAdminUser({
          email: MOCK_ADMIN_USER.email,
          password: '1123',
        });
      } catch (err) {
        // NOTE: toBeInstanceOf doesnt work MongoBulkWriteError
        assert(typeof err === 'object' && !!err && 'code' in err);
        expect((err as MongoBulkWriteError).code).toEqual(11000);
      }
    });
  });

  describe('updateField', () => {
    it('should be able to update field', async () => {
      const createdAdminUser = await mongooseConnection
        .useDb(adminUserDao.database)
        .collection(adminUserDao.collection)
        .insertOne(MOCK_UNVERIFIED_ADMIN_USER);

      await adminUserDao.updateField(
        createdAdminUser.insertedId.toString(),
        'role',
        Role.ADMIN,
      );

      const updatedAdminUser = await mongooseConnection
        .useDb(adminUserDao.database)
        .collection(adminUserDao.collection)
        .findOne({ email: MOCK_UNVERIFIED_ADMIN_USER.email });

      expect(updatedAdminUser?.role).toEqual(Role.ADMIN);
      expect(updatedAdminUser?._id).toEqual(createdAdminUser.insertedId);
    });
  });
});
