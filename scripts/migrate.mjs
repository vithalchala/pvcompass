// Applies SQL migrations from ./drizzle. Plain JS with runtime deps only,
// so it runs as Railway's pre-deploy step without dev tooling.
import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Reads .env.local etc. locally; on Railway the variables are already set.
nextEnv.loadEnvConfig(process.cwd());

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = postgres(url, { max: 1, onnotice: () => {} });
await migrate(drizzle(client), { migrationsFolder: "drizzle" });
await client.end();
console.log("Migrations applied.");
