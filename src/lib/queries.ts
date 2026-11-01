import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { areas, checkRegulations, checks, corpus, regulations, subAreas } from "@/db/schema";

/** Corpus as-of date, or null when the DB is not reachable or not seeded. */
export async function getCorpusAsOf(): Promise<string | null> {
  try {
    const [row] = await db.select({ asOf: corpus.asOf }).from(corpus).limit(1);
    return row?.asOf ?? null;
  } catch {
    return null;
  }
}

export async function listAreas() {
  return db
    .select({
      code: areas.code,
      number: areas.number,
      name: areas.name,
      description: areas.description,
      total: sql<number>`count(${checks.id})::int`,
      approved: sql<number>`count(${checks.id}) filter (where ${checks.status} = 'approved')::int`,
    })
    .from(areas)
    .leftJoin(subAreas, eq(subAreas.areaCode, areas.code))
    .leftJoin(checks, eq(checks.subAreaId, subAreas.id))
    .groupBy(areas.code)
    .orderBy(asc(areas.number));
}

export async function getArea(code: string) {
  return db.query.areas.findFirst({ where: eq(areas.code, code.toUpperCase()) });
}

/** Sub-areas for an area, each with its checks and linked regulation ids. */
export async function getAreaTree(code: string) {
  const subs = await db
    .select()
    .from(subAreas)
    .where(eq(subAreas.areaCode, code))
    .orderBy(asc(subAreas.number));
  const rows = await db
    .select({
      check: checks,
      regulationId: checkRegulations.regulationId,
      title: regulations.title,
      sourceLabel: regulations.sourceLabel,
      section: regulations.section,
    })
    .from(checks)
    .innerJoin(subAreas, eq(subAreas.id, checks.subAreaId))
    .leftJoin(checkRegulations, eq(checkRegulations.checkId, checks.id))
    .leftJoin(regulations, eq(regulations.id, checkRegulations.regulationId))
    .where(eq(subAreas.areaCode, code))
    .orderBy(asc(checks.number));

  type Ref = { id: string; label: string };
  const byCheck = new Map<number, typeof checks.$inferSelect & { regs: Ref[] }>();
  for (const r of rows) {
    const entry = byCheck.get(r.check.id) ?? { ...r.check, regs: [] };
    if (r.regulationId && r.title) entry.regs.push({ id: r.regulationId, label: shortRef(r as RefFields) });
    byCheck.set(r.check.id, entry);
  }
  return subs.map((s) => ({
    ...s,
    checks: [...byCheck.values()].filter((c) => c.subAreaId === s.id),
  }));
}

type RefFields = { title: string; sourceLabel: string | null; section: string | null };

/** Compact citation, e.g. "GVP Module VI · VI.B.6", falling back to the title. */
export function shortRef(r: RefFields) {
  return [r.sourceLabel, r.section].filter(Boolean).join(" · ") || r.title;
}

/**
 * Plain substring search over the regulation text fields and tags.
 * An empty query returns everything; jurisdiction narrows the result.
 */
export async function searchRegulations(q: string, jurisdiction?: string) {
  const term = q.trim().replace(/[\\%_]/g, (c) => `\\${c}`);
  const like = `%${term}%`;
  const text = term
    ? or(
        ilike(regulations.id, like),
        ilike(regulations.title, like),
        ilike(regulations.summary, like),
        ilike(regulations.section, like),
        ilike(regulations.sourceLabel, like),
        sql`array_to_string(${regulations.tags}, ' ') ilike ${like}`,
      )
    : undefined;
  const juris = jurisdiction ? eq(regulations.jurisdiction, jurisdiction) : undefined;
  return db
    .select()
    .from(regulations)
    .where(and(text, juris))
    .orderBy(asc(regulations.jurisdiction), asc(regulations.title));
}

export async function listJurisdictions() {
  const rows = await db
    .selectDistinct({ jurisdiction: regulations.jurisdiction })
    .from(regulations)
    .orderBy(asc(regulations.jurisdiction));
  return rows.map((r) => r.jurisdiction);
}

export async function getRegulation(id: string) {
  const reg = await db.query.regulations.findFirst({ where: eq(regulations.id, id) });
  if (!reg) return null;
  const linked = await db
    .select({
      checkId: checks.id,
      checkNumber: checks.number,
      question: checks.question,
      subNumber: subAreas.number,
      areaCode: areas.code,
      areaNumber: areas.number,
      areaName: areas.name,
    })
    .from(checkRegulations)
    .innerJoin(checks, eq(checks.id, checkRegulations.checkId))
    .innerJoin(subAreas, eq(subAreas.id, checks.subAreaId))
    .innerJoin(areas, eq(areas.code, subAreas.areaCode))
    .where(eq(checkRegulations.regulationId, id))
    .orderBy(asc(areas.number), asc(subAreas.number), asc(checks.number));
  return { ...reg, linked };
}
