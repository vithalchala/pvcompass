import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readRegulationsFile, syncRegulations } from "./regulations-file";
import * as schema from "./schema";

loadEnvConfig(process.cwd());

// Usage: npm run db:load-regulations [path/to/regulations.json]
async function main() {
  const rows = await readRegulationsFile(process.argv[2]);
  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });
  await db.transaction((tx) => syncRegulations(tx, rows));
  console.log(`Loaded ${rows.length} regulations.`);
  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
