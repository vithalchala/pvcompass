import { readFile } from "node:fs/promises";
import path from "node:path";
import { notInArray, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export const REGULATIONS_FILE = path.join(process.cwd(), "data", "regulations.json");

export type RegulationRow = typeof schema.regulations.$inferInsert;

// YYYY-MM or YYYY-MM-DD.
const AS_OF = /^\d{4}-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?$/;

/**
 * Read and validate data/regulations.json. Throws with every problem listed,
 * so a bad file never loads partially.
 */
export async function readRegulationsFile(file = REGULATIONS_FILE): Promise<RegulationRow[]> {
  const raw: unknown = JSON.parse(await readFile(file, "utf8"));
  if (!Array.isArray(raw)) throw new Error(`${file}: expected a JSON array of regulations`);

  const errors: string[] = [];
  const seen = new Set<string>();
  const rows: RegulationRow[] = [];

  raw.forEach((item, i) => {
    const at = `entry ${i}${item && typeof item === "object" && "id" in item ? ` (${String(item.id)})` : ""}`;
    if (!item || typeof item !== "object") return errors.push(`${at}: not an object`);
    const r = item as Record<string, unknown>;

    const str = (key: string, required: boolean) => {
      const v = r[key];
      if (v === undefined || v === null || v === "") {
        if (required) errors.push(`${at}: missing ${key}`);
        return null;
      }
      if (typeof v !== "string") {
        errors.push(`${at}: ${key} must be a string`);
        return null;
      }
      return v.trim();
    };

    const id = str("id", true);
    const title = str("title", true);
    const jurisdiction = str("jurisdiction", true);
    const summary = str("summary", true);
    const asOf = str("as_of", true);
    const section = str("section", false);
    const sourceLabel = str("source_label", false);

    let tags: string[] = [];
    if (r.tags !== undefined && r.tags !== null) {
      if (Array.isArray(r.tags) && r.tags.every((t) => typeof t === "string")) {
        tags = r.tags.map((t: string) => t.trim()).filter(Boolean);
      } else {
        errors.push(`${at}: tags must be an array of strings`);
      }
    }

    if (asOf && !AS_OF.test(asOf)) errors.push(`${at}: as_of must be YYYY-MM or YYYY-MM-DD, got "${asOf}"`);
    if (id && seen.has(id)) errors.push(`${at}: duplicate id`);
    if (id) seen.add(id);

    if (id && title && jurisdiction && summary && asOf) {
      rows.push({ id, title, jurisdiction, section, summary, tags, sourceLabel, asOf });
    }
  });

  if (errors.length) {
    throw new Error(`${file} has ${errors.length} problem(s):\n  - ${errors.join("\n  - ")}`);
  }
  return rows;
}

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/**
 * Make the regulations table match the file: upsert every entry, delete ids
 * no longer present, and set the corpus as-of date to the newest entry.
 */
export async function syncRegulations(db: Db, rows: RegulationRow[]) {
  if (rows.length === 0) {
    await db.delete(schema.regulations);
    return;
  }
  await db.delete(schema.regulations).where(
    notInArray(
      schema.regulations.id,
      rows.map((r) => r.id),
    ),
  );
  await db
    .insert(schema.regulations)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.regulations.id,
      set: {
        title: sql`excluded.title`,
        jurisdiction: sql`excluded.jurisdiction`,
        section: sql`excluded.section`,
        summary: sql`excluded.summary`,
        tags: sql`excluded.tags`,
        sourceLabel: sql`excluded.source_label`,
        asOf: sql`excluded.as_of`,
      },
    });

  const newest = rows.reduce((max, r) => (r.asOf > max ? r.asOf : max), rows[0].asOf);
  await db
    .insert(schema.corpus)
    .values({ id: 1, asOf: newest, note: "data/regulations.json" })
    .onConflictDoUpdate({ target: schema.corpus.id, set: { asOf: newest, note: "data/regulations.json" } });
}
