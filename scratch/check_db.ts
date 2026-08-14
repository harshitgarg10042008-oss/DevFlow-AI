import 'dotenv/config';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { analyses, pullRequests, repositories } from '../drizzle/schema.js';

async function main() {
  const pool = mysql.createPool({ uri: process.env.DATABASE_URL, connectionLimit: 2 });
  const db = drizzle(pool);
  
  const repos = await db.select().from(repositories).execute();
  console.log("REPOS:", repos.length);
  
  const prs = await db.select().from(pullRequests).execute();
  console.log("PRs:", prs.length);
  
  const ans = await db.select().from(analyses).execute();
  console.log("Analyses:", ans.length, ans.map(a => a.status));
  
  process.exit(0);
}
main().catch(console.error);
