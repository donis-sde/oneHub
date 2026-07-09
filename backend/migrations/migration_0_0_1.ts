import { MigrationInterface } from 'mongo-migrate-ts';
import { Db } from 'mongodb';

export class Migration_0_0_1 implements MigrationInterface {
  private readonly collection: string;
  private readonly indexName = 'emailUniqeIndex';
  constructor() {
    if (
      typeof process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION !== 'string'
    ) {
      throw new Error('migration info is invalid');
    }
    this.collection = process.env.NEXT_PUBLIC_DB_AUTH_ADMIN_USER_COLLECTION;
  }

  async up(db: Db): Promise<void> {
    try {
      await db
        .collection(this.collection)
        .createIndex({ email: 1 }, { name: this.indexName, unique: true });
    } catch (err) {
      console.log('Migration up failed ', err);
      throw err;
    }
  }

  async down(db: Db): Promise<void> {
    try {
      await db.collection(this.collection).dropIndex(this.indexName);
    } catch (err) {
      console.log('Migration down failed ', err);
      throw err;
    }
  }
}
