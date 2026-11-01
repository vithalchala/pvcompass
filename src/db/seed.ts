import { existsSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { readRegulationsFile, REGULATIONS_FILE, syncRegulations } from "./regulations-file";
import * as schema from "./schema";
import { AREAS } from "./seed-data";

loadEnvConfig(process.cwd());

async function main() {
  const regs = existsSync(REGULATIONS_FILE) ? await readRegulationsFile() : null;
  if (!regs) console.warn(`No ${REGULATIONS_FILE}; seeding areas without regulations.`);
  const known = new Set(regs?.map((r) => r.id));

  const client = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(client, { schema });
  let linked = 0;
  let skipped = 0;

  await db.transaction(async (tx) => {
    // Full reset of the area tree: the seed is its source of truth.
    await tx.delete(schema.checkRegulations);
    await tx.delete(schema.checks);
    await tx.delete(schema.subAreas);
    await tx.delete(schema.areas);
    if (regs) await syncRegulations(tx, regs);

    for (const [ai, area] of AREAS.entries()) {
      await tx.insert(schema.areas).values({
        code: area.code,
        number: ai + 1,
        name: area.name,
        description: area.description,
      });
      for (const [si, sub] of area.subAreas.entries()) {
        const [row] = await tx
          .insert(schema.subAreas)
          .values({ areaCode: area.code, number: si + 1, name: sub.name, description: sub.description })
          .returning({ id: schema.subAreas.id });
        for (const [ci, c] of sub.checks.entries()) {
          const [chk] = await tx
            .insert(schema.checks)
            .values({ subAreaId: row.id, number: ci + 1, question: c.question, guidance: c.guidance })
            .returning({ id: schema.checks.id });
          const regIds = c.regs.filter((id) => known.has(id));
          skipped += c.regs.length - regIds.length;
          linked += regIds.length;
          if (regIds.length) {
            await tx
              .insert(schema.checkRegulations)
              .values(regIds.map((regulationId) => ({ checkId: chk.id, regulationId })));
          }
        }
      }
    }
  });

  console.log(
    `Seeded ${AREAS.length} areas, ${regs?.length ?? 0} regulations, ${linked} check links` +
      (skipped ? ` (${skipped} links skipped: regulation id not in file).` : "."),
  );
  await client.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
