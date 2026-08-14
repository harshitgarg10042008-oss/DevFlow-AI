import 'dotenv/config';
import { getDb } from './server/db.js';
import { pullRequests } from './drizzle/schema.js';

async function main() {
  const db = await getDb();
  if (!db) return;
  const prs = await db.select().from(pullRequests).execute();
  console.log(JSON.stringify(prs, null, 2));
  process.exit(0);
}
main().catch(console.error);
