// Cached MongoDB Atlas connection (reused across warm serverless invocations).
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'oi_license';

let cached = globalThis._oiMongo;
if (!cached) cached = globalThis._oiMongo = { client: null, promise: null };

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI is not set');
  if (cached.client) return cached.client.db(dbName);
  if (!cached.promise) {
    cached.promise = new MongoClient(uri, { maxPoolSize: 5 }).connect().then((client) => {
      cached.client = client;
      return client;
    });
  }
  const client = await cached.promise;
  return client.db(dbName);
}

export async function licenses() {
  const db = await getDb();
  const col = db.collection('licenses');
  // Unique index on the key (idempotent to create).
  await col.createIndex({ key: 1 }, { unique: true }).catch(() => {});
  return col;
}

// Purchases submitted from the billionit /oi page (same database, written by the website).
export async function purchases() {
  const db = await getDb();
  return db.collection('oi_purchases');
}
