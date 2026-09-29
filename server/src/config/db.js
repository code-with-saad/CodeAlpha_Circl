import mongoose from 'mongoose';

// Serverless functions are frozen and reused between requests, so the
// connection promise is cached on globalThis to avoid a new connection per call.
const cache = globalThis.__mongoose || (globalThis.__mongoose = { conn: null, promise: null });

export async function connectDB() {
  if (cache.conn) return cache.conn;
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  cache.promise ??= mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }
  return cache.conn;
}
