import { getServerDiContainer } from '@/global/serverDiContainer';
import { TenantDao } from '@/dataAccess/TenantDao';
import {
  YESTERDAY_CREATED_ACTIVE_TENANT,
  ACTIVE_TENANT,
  INACTIVE_TENANT,
} from '../seeds/mockTenants';
import { Connection } from 'mongoose';
import { QUERY_LIMIT } from '../constant';
import { DateTime } from 'luxon';

const seedData = [
  YESTERDAY_CREATED_ACTIVE_TENANT,
  ACTIVE_TENANT,
  INACTIVE_TENANT,
];

describe('TenantDao Integration Test', () => {
  let mongooseConnection: Connection;
  let tenantDao: TenantDao;

  beforeAll(async () => {
    const { mongooseConnection: _mongooseConnection, tenantDao: _tenantDao } =
      await getServerDiContainer(global.__MONGO_URI__);
    mongooseConnection = _mongooseConnection;
    tenantDao = _tenantDao;

    await mongooseConnection
      .useDb(tenantDao.database)
      .collection(tenantDao.collection)
      .insertMany(seedData);
  });

  describe('list', () => {
    it('should be able to list tenants', async () => {
      const paginatedTenants = await tenantDao.list({
        skip: 0,
        limit: seedData.length + 1,
      });

      expect(paginatedTenants.count).toBe(seedData.length);
      expect(paginatedTenants.data.length).toBe(seedData.length);
      expect(paginatedTenants?.paginator.skip).toBe(0);
      expect(paginatedTenants?.paginator.limit).toBe(seedData.length + 1);
    });

    it('should be able to return empty list when pagination end', async () => {
      const paginatedTenants = await tenantDao.list({
        skip: seedData.length + 1,
        limit: QUERY_LIMIT,
      });

      expect(paginatedTenants.count).toBe(seedData.length);
      expect(paginatedTenants.data.length).toBe(0);
    });

    it('should be able to paginate', async () => {
      const limit = seedData.length - 1;
      const paginatedTenants = await tenantDao.list({
        skip: 0,
        limit: 2,
      });

      expect(paginatedTenants.count).toBe(seedData.length);
      expect(paginatedTenants.data.length).toBe(limit);
      expect(paginatedTenants.paginator?.skip).toBe(0);
      expect(paginatedTenants.paginator?.limit).toBe(limit);
      expect(paginatedTenants.hasNext).toBe(true);

      const nextSkip = 2;
      const nextPaginatedTenants = await tenantDao.list({
        skip:
          paginatedTenants.paginator?.skip + paginatedTenants.paginator?.limit,
        limit: paginatedTenants.paginator?.limit,
      });

      expect(nextPaginatedTenants.count).toBe(seedData.length);
      expect(nextPaginatedTenants.data.length).toBe(
        seedData.length - limit > limit ? limit : seedData.length - limit,
      );
      expect(nextPaginatedTenants.paginator?.skip).toBe(nextSkip);
      expect(nextPaginatedTenants.paginator?.limit).toBe(limit);
      expect(nextPaginatedTenants.hasNext).toBe(false);
    });

    it('should be able to do filter by eq', async () => {
      const equalFilter = {
        BackendDomain: {
          $eq: ACTIVE_TENANT?.BackendDomain,
        },
      };
      const paginatedTenants = await tenantDao.list(
        {
          skip: 0,
          limit: QUERY_LIMIT,
        },
        equalFilter,
      );
      expect(paginatedTenants.count).toBe(1);
      expect(paginatedTenants.data[0]).toMatchObject(ACTIVE_TENANT);
    });

    it('should be able to do filter by lt', async () => {
      const filterDate = DateTime.fromJSDate(
        YESTERDAY_CREATED_ACTIVE_TENANT.Created,
      )
        .plus({ hours: 4 })
        .toJSDate();
      const lessThanFilter = {
        Created: {
          $lt: filterDate.toISOString(),
        },
      };
      const paginatedTenants = await tenantDao.list(
        {
          skip: 0,
          limit: QUERY_LIMIT,
        },
        lessThanFilter,
      );
      expect(paginatedTenants.count).toBe(1);
      expect(paginatedTenants.data[0]).toMatchObject(
        YESTERDAY_CREATED_ACTIVE_TENANT,
      );
    });

    it('should be able to do filter by like', async () => {
      const clientEmailPattern = ACTIVE_TENANT?.ClientEmail?.slice(1, -1);
      const containsFilter = {
        ClientEmail: {
          $regex: new RegExp(`${clientEmailPattern}`),
        },
      };
      const paginatedTenants = await tenantDao.list(
        {
          skip: 0,
          limit: QUERY_LIMIT,
        },
        containsFilter,
      );
      expect(paginatedTenants.count).toEqual(1);
      expect(paginatedTenants.data[0]).toMatchObject(ACTIVE_TENANT);
    });
  });
});
