import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "../lib/password";
import * as schema from "./schema";
import { ROLES, type Role } from "./schema";

loadEnvConfig(process.cwd());

// Usage: USER_PASSWORD=... npm run user:add -- <email> "<Full Name>" <role,role>
// Roles: viewer, check_owner, mapping_approver, library_owner, company_admin.
// Re-running with the same email updates the name, roles and password.
async function main() {
  const [email, name, rolesArg] = process.argv.slice(2);
  const password = process.env.USER_PASSWORD;
  if (!email || !name || !rolesArg || !password) {
    throw new Error('Usage: USER_PASSWORD=... npm run user:add -- <email> "<Full Name>" <role,role>');
  }
  const roles = rolesArg.split(",").map((r) => r.trim());
  const bad = roles.filter((r) => !ROLES.includes(r as Role));
  if (bad.length) throw new Error(`Unknown role(s): ${bad.join(", ")}. Allowed: ${ROLES.join(", ")}`);

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });
  const row = { email: email.toLowerCase(), name, roles, passwordHash: await hashPassword(password) };
  await db.insert(schema.users).values(row).onConflictDoUpdate({ target: schema.users.email, set: row });
  console.log(`Saved ${row.email} (${roles.join(", ")}).`);
  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
