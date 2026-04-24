import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

function getDb(): DB {
  if (_db) return _db;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Set it in .env.local or your deployment environment.",
    );
  }
  const client = postgres(connectionString, { prepare: false });
  _db = drizzle(client, { schema, casing: "snake_case" });
  return _db;
}

/**
 * Lazy-initialized drizzle instance. 실제 쿼리가 호출될 때 DATABASE_URL을 검사한다.
 * (빌드 시 모듈 import 과정에서 throw되지 않도록 Proxy로 감쌈.)
 */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
