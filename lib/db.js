import mongoose from "mongoose";

/**
 * MongoDB connection helper (Mongoose).
 *
 * Next.js dev mode hot-reload pe module baar-baar evaluate hota hai —
 * isliye connection ko globalThis pe cache karte hain, warna har reload
 * pe nayi connection banegi aur "too many connections" error aayega.
 *
 * Har DB-touching API route / service ke top pe `await dbConnect()` call karo.
 */

const MONGODB_URI = process.env.MONGODB_URI;

let cached = globalThis._mongoose;
if (!cached) {
  cached = globalThis._mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI missing — .env.local set karo (see .env.example)");
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: process.env.MONGODB_DB || "anthroplanet",
        bufferCommands: false,
      })
      .then((m) => m);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default dbConnect;
