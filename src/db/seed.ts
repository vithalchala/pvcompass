import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../lib/password";
import { readLibraryFiles, syncLibrary, validateLibrary } from "./library-file";
import { readRegulationsFile, syncRegulations } from "./regulations-file";
import * as schema from "./schema";
import { ROLES } from "./schema";

loadEnvConfig(process.cwd());

// Usage: npm run db:seed
// Loads regulations, the frozen reference model and the check library, and
// creates the first admin user from ADMIN_EMAIL / ADMIN_PASSWORD if there are no users.
async function main() {
  const regs = await readRegulationsFile();
  const { model, library } = await readLibraryFiles();
  const errors = validateLibrary(model, library, new Set(regs.map((r) => r.id)));
  if (errors.length) {
    throw new Error(`Check library has ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
  }

  const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
  const db = drizzle(client, { schema });

  const report = await db.transaction(async (tx) => {
    await syncRegulations(tx, regs);
    return syncLibrary(tx, model, library);
  });

  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.users);
  let createdAdmin = "";
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("No users yet: set ADMIN_EMAIL and ADMIN_PASSWORD to create the first one.");
    await db.insert(schema.users).values({
      email: email.toLowerCase(),
      name: process.env.ADMIN_NAME || "Admin",
      roles: [...ROLES],
      passwordHash: await hashPassword(password),
    });
    createdAdmin = ` Created admin user ${email}.`;
  }

  console.log(
    `Loaded ${regs.length} regulations, ${report.areas} areas, ${report.subAreas} sub-areas. ` +
      `Checks: ${report.added} added, ${report.revised} revised (back to draft), ${report.unchanged} unchanged.` +
      createdAdmin,
  );
  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
