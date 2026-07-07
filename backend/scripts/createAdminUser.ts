import dotenv from 'dotenv';
import path from 'path';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import { Role } from '../src/enums/Role';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@wati.local';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';

async function main(): Promise<void> {
  const dbUrl = process.env.DB_URL;
  const dbName = process.env.NEXT_PUBLIC_DB_AUTH_DATABASE;
  // Mongoose adminUserSchema hardcodes collection name 'adminUsers'
  const collectionName = 'adminUsers';

  if (!dbUrl || !dbName) {
    throw new Error('Missing DB_URL or NEXT_PUBLIC_DB_AUTH_DATABASE env vars');
  }

  const client = new MongoClient(dbUrl);
  await client.connect();

  try {
    const collection = client.db(dbName).collection(collectionName);
    const existing = await collection.findOne({ email });

    if (existing) {
      await collection.updateOne({ email }, { $set: { role: Role.ADMIN } });
      console.log(`Updated existing user to admin: ${email}`);
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await collection.insertOne({
      email,
      passwordHash,
      salt,
      role: Role.ADMIN,
    });

    console.log(`Created admin user: ${email}`);
    console.log(`Password: ${password}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
