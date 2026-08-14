import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

let db: ReturnType<typeof drizzle> | null = null;
let warned = false;

function buildPool(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "mysql:") {
    throw new Error(`DATABASE_URL must use mysql:// for this project; received ${parsed.protocol}`);
  }

  return createPool({
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    connectTimeout: 5000,
    waitForConnections: true,
    connectionLimit: 10,
    enableKeepAlive: true,
  });
}

export async function getDb() {
  if (!db && process.env.DATABASE_URL) {
    try {
      db = drizzle(buildPool(process.env.DATABASE_URL) as any);
    } catch (error) {
      if (!warned) {
        warned = true;
        console.warn("[Database] Database unavailable:", error instanceof Error ? error.message : "connection initialization failed");
      }
    }
  }
  return db;
}

export function resetDbForTests() {
  db = null;
  warned = false;
}
