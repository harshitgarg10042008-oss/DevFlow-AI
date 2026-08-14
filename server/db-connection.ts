import { drizzle } from "drizzle-orm/mysql2";

let db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!db && process.env.DATABASE_URL) {
    try {
      db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
    }
  }
  return db;
}

export function resetDbForTests() {
  db = null;
}
