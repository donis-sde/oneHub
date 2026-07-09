/* eslint-disable */
// @ts-nocheck
import { MongoClient, MongoClientOptions } from 'mongodb';

const CONFIG_COLLECTION = 'usage_calculator_config';
const INR_TO_USD_KEY = 'inr_to_usd_fx_rate';
const DEFAULT_INR_TO_USD_RATE = 0.012;

async function getDb() {
  const DB_URL = process.env.DB_URL;
  const DB_NAME = process.env.TENANTS_DATABASE;
  if (!DB_URL || !DB_NAME) {
    throw new Error(
      'DB_URL and TENANTS_DATABASE are required for usage calculator config',
    );
  }
  const client = new MongoClient(DB_URL, {
    useUnifiedTopology: true,
  } as MongoClientOptions);
  await client.connect();
  return { client, db: client.db(DB_NAME) };
}

/**
 * Get INR to USD FX rate from DB (used when currency is INR). Default 0.012.
 */
export async function getInrToUsdRate(): Promise<number> {
  let client;
  try {
    const { client: c, db } = await getDb();
    client = c;
    const doc = await db
      .collection(CONFIG_COLLECTION)
      .findOne({ _id: INR_TO_USD_KEY });
    const value = doc?.value;
    if (value != null && typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    return DEFAULT_INR_TO_USD_RATE;
  } finally {
    if (client) await client.close();
  }
}

/**
 * Set INR to USD FX rate in DB. Caller must enforce admin-only.
 */
export async function setInrToUsdRate(rate: number): Promise<void> {
  if (typeof rate !== 'number' || Number.isNaN(rate) || rate <= 0) {
    throw new Error('Invalid FX rate: must be a positive number');
  }
  let client;
  try {
    const { client: c, db } = await getDb();
    client = c;
    await db
      .collection(CONFIG_COLLECTION)
      .updateOne(
        { _id: INR_TO_USD_KEY },
        { $set: { value: rate, updatedAt: new Date() } },
        { upsert: true },
      );
  } finally {
    if (client) await client.close();
  }
}
