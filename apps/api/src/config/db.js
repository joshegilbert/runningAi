import mongoose from "mongoose";

const g = globalThis;

function getCache() {
  if (!g.__mongooseRunAi) {
    g.__mongooseRunAi = { conn: null, promise: null };
  }
  return g.__mongooseRunAi;
}

export default async function connectDb() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI missing in .env");

  const cache = getCache();
  if (cache.conn) {
    return cache.conn;
  }
  if (!cache.promise) {
    cache.promise = mongoose.connect(uri).then(() => mongoose);
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
