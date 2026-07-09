import {
  Pool,
  ResultSetHeader,
  RowDataPacket,
  PoolConnection,
} from 'mysql2/promise';
import {
  Partner,
  Customer,
  Subscription,
  SyncStatusGroup,
  SyncStatusType,
  SyncStatus,
} from './models/PrmGateway';
import { Paginator } from '@/types/Pagination';
import { v4 as uuidv4 } from 'uuid';

interface CountResult extends RowDataPacket {
  total: number;
}

interface ListResult<T> {
  total: number;
  data: T[];
}

interface CustomerChange {
  action: 'create' | 'update' | 'delete';
  id?: number;
  customer_email?: string;
  customer_id?: string;
}

export class PrmGatewayDao {
  constructor(private pool: Pool) {}

  async getPartner(partnerId: string): Promise<Partner> {
    const [partner] = await this.pool.query<Partner[]>(
      'SELECT * FROM partners WHERE id = ?',
      [partnerId],
    );
    if (!partner[0]) {
      throw new Error('Partner not found');
    }
    return partner[0];
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const [customer] = await this.pool.query<Customer[]>(
      'SELECT * FROM customers WHERE customer_id = ?',
      [customerId],
    );
    if (!customer[0]) {
      throw new Error('Customer not found');
    }
    return customer[0];
  }

  async listPartners(
    { skip, limit }: Paginator,
    filter?: Partial<{ [key in keyof Partner]: unknown }>,
    sortBy?: Partial<{ [key in keyof Partner]: 'asc' | 'desc' }>,
  ): Promise<ListResult<Partner>> {
    let sql = `SELECT * FROM partners WHERE deleted_at IS NULL`;
    let countSql = `SELECT COUNT(*) as total FROM partners WHERE deleted_at IS NULL`;
    const params: (string | number)[] = [];
    if (filter?.id) {
      sql += ` AND id = ?`;
      countSql += ` AND id = ?`;
      params.push(filter.id as string);
    }
    if (filter?.partner_type) {
      sql += ` AND partner_type = ?`;
      countSql += ` AND partner_type = ?`;
      params.push(filter.partner_type as string);
    }
    if (filter?.partner_name) {
      sql += ` AND partner_name LIKE ?`;
      countSql += ` AND partner_name LIKE ?`;
      params.push(`%${filter.partner_name}%`);
    }
    if (filter?.partner_email) {
      sql += ` AND partner_email LIKE ?`;
      countSql += ` AND partner_email LIKE ?`;
      params.push(`%${filter.partner_email}%`);
    }

    const sortByStm = [];
    if (!sortBy) {
      sortByStm.push('created_at DESC');
    }
    for (const key in sortBy) {
      if (Object.prototype.hasOwnProperty.call(sortBy, key)) {
        const typedKey = key as keyof typeof sortBy;
        sortByStm.push(`${key} ${sortBy[typedKey]}`);
      }
    }
    sql += ` ORDER BY ${sortByStm.join(', ')}`;

    sql += ` LIMIT ${limit} OFFSET ${skip}`;
    return Promise.all([
      this.pool.query<CountResult[]>(countSql, params),
      this.pool.query<Partner[]>(sql, params),
    ]).then(([[countResult], [partners]]) => {
      return {
        total: countResult[0]?.total ?? 0,
        data: partners,
      };
    });
  }

  async listCustomers(
    { skip, limit }: Paginator,
    filter?: Partial<{ [key in keyof Customer]: unknown }>,
    sortBy?: Partial<{ [key in keyof Customer]: 'asc' | 'desc' }>,
  ): Promise<ListResult<Customer>> {
    let sql = `SELECT * FROM customers WHERE deleted_at IS NULL`;
    let countSql = `SELECT COUNT(*) as total FROM customers WHERE deleted_at IS NULL`;
    const params: (string | number)[] = [];
    if (filter?.partner_id) {
      sql += ` AND partner_id = ?`;
      countSql += ` AND partner_id = ?`;
      params.push(filter.partner_id as string);
    }
    if (filter?.customer_id) {
      sql += ` AND customer_id = ?`;
      countSql += ` AND customer_id = ?`;
      params.push(filter.customer_id as string);
    }
    if (filter?.customer_email) {
      sql += ` AND customer_email LIKE ?`;
      countSql += ` AND customer_email LIKE ?`;
      params.push(`%${filter.customer_email}%`);
    }

    const sortByStm = [];
    if (!sortBy) {
      sortByStm.push('created_at DESC');
    }
    for (const key in sortBy) {
      if (Object.prototype.hasOwnProperty.call(sortBy, key)) {
        const typedKey = key as keyof typeof sortBy;
        sortByStm.push(`${key} ${sortBy[typedKey]}`);
      }
    }

    sql += ` ORDER BY ${sortByStm.join(', ')}`;

    if (skip >= 0 && limit > 0) {
      sql += ` LIMIT ${limit} OFFSET ${skip}`;
    }

    return Promise.all([
      this.pool.query<CountResult[]>(countSql, params),
      this.pool.query<Customer[]>(sql, params),
    ]).then(async ([[countResult], [customers]]) => {
      const customerIDs = customers.map((customer) => customer.customer_id);
      if (customerIDs?.length > 0) {
        const [syncStatuses] = await this.pool.query<SyncStatusGroup[]>(
          "SELECT c.customer_id, CONCAT('[',GROUP_CONCAT(JSON_OBJECT('type', s.type, 'last_executed_at', s.last_executed_at)),']') as sync_statuses FROM customers c LEFT JOIN sync s ON c.customer_id = s.customer_id WHERE c.customer_id IN (?) GROUP BY c.customer_id",
          [customerIDs],
        );
        customers = customers.map((customer) => {
          const syncStatus = JSON.parse(
            syncStatuses.find(
              (status) => status.customer_id === customer.customer_id,
            )?.sync_statuses ?? '[]',
          ) as SyncStatus[];

          let computedSyncStatus: SyncStatusType | null = null;
          const now = new Date();
          if (syncStatus.length > 0) {
            computedSyncStatus = syncStatus.reduce<SyncStatusType | null>(
              (acc, status) => {
                const lastExecutedDate = status.last_executed_at
                  ? new Date(status.last_executed_at)
                  : null;
                if (acc === SyncStatusType.ABLE_TO_SYNC) {
                  return acc;
                } else if (lastExecutedDate === null) {
                  return SyncStatusType.ABLE_TO_SYNC;
                } else if (lastExecutedDate < this.getSyncTime()) {
                  return SyncStatusType.ABLE_TO_SYNC;
                }
                return SyncStatusType.SYNCED;
              },
              null,
            );
          }
          customer.sync_status =
            computedSyncStatus ?? SyncStatusType.ABLE_TO_SYNC;
          return customer;
        });
      }

      return {
        total: countResult[0]?.total ?? 0,
        data: customers,
      };
    });
  }

  async listSubscriptions(
    { skip, limit }: Paginator,
    filter?: Partial<{ [key in keyof Subscription]: unknown }>,
    sortBy?: Partial<{ [key in keyof Subscription]: 'asc' | 'desc' }>,
  ): Promise<ListResult<Subscription>> {
    let sql = `SELECT * FROM subscriptions WHERE deleted_at IS NULL`;
    let countSql = `SELECT COUNT(*) as total FROM subscriptions WHERE deleted_at IS NULL`;
    const params: (string | number)[] = [];
    if (filter?.partner_id) {
      sql += ` AND partner_id = ?`;
      countSql += ` AND partner_id = ?`;
      params.push(filter.partner_id as string);
    }
    if (filter?.customer_id) {
      sql += ` AND customer_id = ?`;
      countSql += ` AND customer_id = ?`;
      params.push(filter.customer_id as string);
    }
    if (filter?.subscription_id) {
      sql += ` AND subscription_id = ?`;
      countSql += ` AND subscription_id = ?`;
      params.push(filter.subscription_id as string);
    }

    const sortByStm = [];
    if (!sortBy) {
      sortByStm.push('created_at DESC');
    }
    for (const key in sortBy) {
      if (Object.prototype.hasOwnProperty.call(sortBy, key)) {
        const typedKey = key as keyof typeof sortBy;
        sortByStm.push(`${key} ${sortBy[typedKey]}`);
      }
    }

    sql += ` ORDER BY ${sortByStm.join(', ')}`;

    if (skip >= 0 && limit > 0) {
      sql += ` LIMIT ${limit} OFFSET ${skip}`;
    }

    return Promise.all([
      this.pool.query<CountResult[]>(countSql, params),
      this.pool.query<Subscription[]>(sql, params),
    ]).then(async ([[countResult], [subscriptions]]) => {
      return {
        total: countResult[0]?.total ?? 0,
        data: subscriptions,
      };
    });
  }

  getSyncTime(): Date {
    // get the 3AM UTC of the current day
    const now = new Date();
    const syncTime = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        3,
        0,
        0,
        0,
      ),
    );
    return syncTime;
  }

  async insertPartner(partner: Partner, customers: Customer[]): Promise<void> {
    let id = partner.id;
    if (!partner.id) {
      id = uuidv4();
    }

    let conn: PoolConnection | null = null;
    try {
      conn = await this.pool.getConnection();
      await conn.beginTransaction();
      await conn.query<ResultSetHeader>(
        'INSERT INTO partners (id, partner_type, partner_name, partner_email, source) VALUES (?, ?, ?, ?, ?)',
        [
          id,
          partner.partner_type,
          partner.partner_name,
          partner.partner_email,
          'manual',
        ],
      );
      if (customers.length > 0) {
        await this.insertCustomers(id, customers, conn);
      }
      await conn.commit();
    } catch (error) {
      if (conn) {
        console.log('[PrmGatewayDao] Rolling back transaction');
        await conn.rollback();
      }
      throw error;
    } finally {
      if (conn) {
        conn.release();
      }
    }
  }

  async insertCustomers(
    partnerId: string,
    customers: Customer[],
    conn?: PoolConnection,
  ): Promise<void> {
    const newConn = conn ?? (await this.pool.getConnection());
    await newConn.query<ResultSetHeader>(
      'INSERT INTO customers (partner_id, customer_id, customer_email) VALUES ?',
      [
        customers.map((customer) => [
          partnerId,
          customer.customer_id,
          customer.customer_email,
        ]),
      ],
    );
  }

  async insertCustomer(
    partnerId: string,
    customer: Customer,
    conn?: PoolConnection,
  ): Promise<void> {
    const newConn = conn ?? (await this.pool.getConnection());
    await newConn.query<ResultSetHeader>(
      'INSERT INTO customers (partner_id, customer_id, customer_email) VALUES (?, ?, ?)',
      [partnerId, customer.customer_id, customer.customer_email],
    );
  }

  async updatePartner(
    partnerId: string,
    partner?: Partner,
    customerChanges?: CustomerChange[],
  ): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      if (partner) {
        await conn.query(
          'UPDATE partners SET partner_type = ?, partner_name = ? WHERE id = ?',
          [partner.partner_type, partner.partner_name, partner.id],
        );
      }
      if (customerChanges) {
        for (const change of customerChanges) {
          switch (change.action) {
            case 'create':
              if (!change.customer_id || !change.customer_email) {
                throw new Error('Customer ID and email are required');
              }
              await this.insertCustomer(
                partnerId,
                {
                  partner_id: partnerId,
                  customer_id: change.customer_id,
                  customer_email: change.customer_email,
                } as Customer,
                conn,
              );
              break;
            case 'update':
              if (!change.customer_id) {
                throw new Error('Customer ID is required');
              }
              await this.updateCustomer(
                {
                  partner_id: partnerId,
                  customer_id: change.customer_id,
                  customer_email: change.customer_email,
                } as Customer,
                conn,
              );
              break;
            case 'delete':
              if (!change.customer_id) {
                throw new Error('Customer ID is required');
              }
              await this.removeCustomers([change.customer_id], conn);
              break;
          }
        }
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }
  async updateCustomer(
    customer: Customer,
    conn?: PoolConnection,
  ): Promise<void> {
    const newConn = conn ?? (await this.pool.getConnection());
    await newConn.query(
      'UPDATE customers SET customer_email = ? WHERE id = ?',
      [customer.customer_email, customer.id],
    );
  }

  async forceSyncPartner(partnerId: string): Promise<void> {
    let page = 0;
    const limit = 100;
    const partner = await this.getPartner(partnerId);
    let isInsertedManually = false;
    if (partner.source === 'manual') {
      isInsertedManually = true;
    }
    for (; ; page++) {
      const customers = await this.listCustomers(
        {
          limit: limit,
          skip: page <= 0 ? 0 : page * limit,
        },
        {
          partner_id: partnerId,
        },
      );
      const conn = await this.pool.getConnection();
      await conn.beginTransaction();
      try {
        for (const customer of customers.data) {
          if (isInsertedManually) {
            await conn.query(
              'INSERT INTO sync (customer_id, type) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?) ON DUPLICATE KEY UPDATE last_executed_at = NULL',
              [
                customer.customer_id,
                'credit_usage',
                customer.customer_id,
                'invoice',
                customer.customer_id,
                'metrics',
                customer.customer_id,
                'operator_performance',
                customer.customer_id,
                'subscriptions_for_manual_add_partner',
              ],
            );
          } else {
            await conn.query(
              'INSERT INTO sync (customer_id, type) VALUES (?, ?), (?, ?), (?, ?), (?, ?) ON DUPLICATE KEY UPDATE last_executed_at = NULL',
              [
                customer.customer_id,
                'credit_usage',
                customer.customer_id,
                'invoice',
                customer.customer_id,
                'metrics',
                customer.customer_id,
                'operator_performance',
              ],
            );
          }
        }
        await conn.commit();
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
      if (customers.data.length < limit) {
        break;
      }
    }
  }

  async forceSyncCustomer(customerId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    const partner = await this.getPartner(customer.partner_id);

    const conn = await this.pool.getConnection();
    await conn.beginTransaction();
    try {
      if (partner.source === 'manual') {
        await conn.query(
          'INSERT INTO sync (customer_id, type) VALUES (?, ?), (?, ?), (?, ?), (?, ?), (?, ?) ON DUPLICATE KEY UPDATE last_executed_at = NULL',
          [
            customerId,
            'credit_usage',
            customerId,
            'invoice',
            customerId,
            'metrics',
            customerId,
            'operator_performance',
            customerId,
            'subscriptions_for_manual_add_partner',
          ],
        );
      } else {
        await conn.query(
          'INSERT INTO sync (customer_id, type) VALUES (?, ?), (?, ?), (?, ?), (?, ?) ON DUPLICATE KEY UPDATE last_executed_at = NULL',
          [
            customerId,
            'credit_usage',
            customerId,
            'invoice',
            customerId,
            'metrics',
            customerId,
            'operator_performance',
          ],
        );
      }
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async removePartner(partner: Partner): Promise<void> {
    const conn = await this.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE partners SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?',
        [partner.id],
      );

      await conn.query(
        'UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE partner_id = ?',
        [partner.id],
      );

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  async removeCustomers(ids: string[], conn?: PoolConnection): Promise<void> {
    const newConn = conn ?? (await this.pool.getConnection());
    await newConn.query(
      'UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id IN (?)',
      [ids],
    );
  }
}
