import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

try {
  const parsed = new URL(connectionString);
  if (parsed.protocol !== "mysql:") {
    throw new Error(
      `DATABASE_URL must use mysql:// for this project; received ${parsed.protocol}`,
    );
  }
} catch (error) {
  if (error instanceof Error && error.message.startsWith("DATABASE_URL must use")) {
    throw error;
  }
  throw new Error("DATABASE_URL must be a valid mysql:// connection string");
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
