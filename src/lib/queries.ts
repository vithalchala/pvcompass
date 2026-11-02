import "server-only";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  areas,
  checkReviews,
  checkVersions,
  corpus,
  crosswalks,
  refChecks,
  regulations,
  subAreas,
  users,
} from "@/db/schema";

/** Corpus as-of date, or null when the DB is not reachable or not seeded. */
export async function getCorpusAsOf(): Promise<string | null> {
  try {
    const [row] = await db.select({ asOf: corpus.asOf }).from(corpus).limit(1);
    return row?.asOf ?? null;
  } catch {
    return null;
  }
}

const countWhere = (cond: ReturnType<typeof sql>) => sql<number>`count(${refChecks.checkId}) filter (where ${cond})::int`;

export async function listAreas() {
  return db
    .select({
      code: areas.code,
      number: areas.number,
      name: areas.name,
      description: areas.description,
      subAreas: sql<number>`count(distinct ${subAreas.code})::int`,
      total: countWhere(sql`${refChecks.status} <> 'retired'`),
      approved: countWhere(sql`${refChecks.status} = 'approved'`),
      draft: countWhere(sql`${refChecks.status} = 'draft'`),
    })
    .from(areas)
    .leftJoin(subAreas, eq(subAreas.areaCode, areas.code))
    .leftJoin(refChecks, eq(refChecks.subAreaCode, subAreas.code))
    .groupBy(areas.code)
    .orderBy(asc(areas.number));
}

export async function getArea(code: string) {
  return db.query.areas.findFirst({ where: eq(areas.code, code.toUpperCase()) });
}

export type CrosswalkRef = { citation: string; jurisdiction: string; regulationId: string | null };

async function crosswalksFor(checkIds: string[]) {
  const map = new Map<string, CrosswalkRef[]>();
  if (checkIds.length === 0) return map;
  const rows = await db
    .select()
    .from(crosswalks)
    .where(inArray(crosswalks.checkId, checkIds))
    .orderBy(asc(crosswalks.id));
  for (const r of rows) {
    const list = map.get(r.checkId) ?? [];
    list.push({ citation: r.citationText, jurisdiction: r.jurisdiction, regulationId: r.regulationId });
    map.set(r.checkId, list);
  }
  return map;
}

const checkColumns = {
  checkId: refChecks.checkId,
  version: refChecks.version,
  subAreaCode: refChecks.subAreaCode,
  statement: refChecks.statement,
  applicability: refChecks.applicability,
  inspectorEvidence: refChecks.inspectorEvidence,
  status: refChecks.status,
  draftedBy: refChecks.draftedBy,
  approvedAt: refChecks.approvedAt,
  approvedByName: users.name,
  updatedAt: refChecks.updatedAt,
};

/** Checks sort by their number within the area: ICSR-02 before ICSR-10. */
const byCheckNumber = sql`split_part(${refChecks.checkId}, '-', 2)::int`;

/** Sub-areas for an area, each with its checks and crosswalks. */
export async function getAreaTree(code: string, opts: { includeRetired?: boolean } = {}) {
  const subs = await db.select().from(subAreas).where(eq(subAreas.areaCode, code)).orderBy(asc(subAreas.number));
  const rows = await db
    .select(checkColumns)
    .from(refChecks)
    .innerJoin(subAreas, eq(subAreas.code, refChecks.subAreaCode))
    .leftJoin(users, eq(users.id, refChecks.approvedBy))
    .where(
      and(
        eq(subAreas.areaCode, code),
        opts.includeRetired ? undefined : sql`${refChecks.status} <> 'retired'`,
      ),
    )
    .orderBy(byCheckNumber);
  const xw = await crosswalksFor(rows.map((r) => r.checkId));
  const checks = rows.map((r) => ({ ...r, crosswalks: xw.get(r.checkId) ?? [] }));
  return subs.map((s) => ({ ...s, checks: checks.filter((c) => c.subAreaCode === s.code) }));
}

export type TreeCheck = Awaited<ReturnType<typeof getAreaTree>>[number]["checks"][number];

/** One check with its place in the hierarchy, crosswalks, versions and review history. */
export async function getCheck(checkId: string) {
  const [row] = await db
    .select({
      ...checkColumns,
      subAreaName: subAreas.name,
      areaCode: areas.code,
      areaName: areas.name,
      areaNumber: areas.number,
    })
    .from(refChecks)
    .innerJoin(subAreas, eq(subAreas.code, refChecks.subAreaCode))
    .innerJoin(areas, eq(areas.code, subAreas.areaCode))
    .leftJoin(users, eq(users.id, refChecks.approvedBy))
    .where(eq(refChecks.checkId, checkId.toUpperCase()))
    .limit(1);
  if (!row) return null;
  const [xw, versions, reviews] = await Promise.all([
    crosswalksFor([row.checkId]),
    db.select().from(checkVersions).where(eq(checkVersions.checkId, row.checkId)).orderBy(desc(checkVersions.version)),
    db
      .select({
        id: checkReviews.id,
        version: checkReviews.version,
        decision: checkReviews.decision,
        comment: checkReviews.comment,
        decidedAt: checkReviews.decidedAt,
        reviewer: users.name,
      })
      .from(checkReviews)
      .innerJoin(users, eq(users.id, checkReviews.reviewerId))
      .where(eq(checkReviews.checkId, row.checkId))
      .orderBy(desc(checkReviews.decidedAt), desc(checkReviews.id)),
  ]);
  return { ...row, crosswalks: xw.get(row.checkId) ?? [], versions, reviews };
}

/** Short citation: the part of the title before " — ", e.g. "GVP Module VI". */
export function shortRef(r: { title: string }) {
  return r.title.split(" — ")[0];
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
    .orderBy(sql`${regulations.section} asc nulls last`, asc(regulations.title));
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
    .selectDistinct({
      checkId: refChecks.checkId,
      statement: refChecks.statement,
      status: refChecks.status,
      citation: crosswalks.citationText,
      areaCode: areas.code,
      areaName: areas.name,
      areaNumber: areas.number,
    })
    .from(crosswalks)
    .innerJoin(refChecks, eq(refChecks.checkId, crosswalks.checkId))
    .innerJoin(subAreas, eq(subAreas.code, refChecks.subAreaCode))
    .innerJoin(areas, eq(areas.code, subAreas.areaCode))
    .where(and(eq(crosswalks.regulationId, id), sql`${refChecks.status} <> 'retired'`))
    .orderBy(asc(areas.number), asc(refChecks.checkId));
  return { ...reg, linked };
}

/** Live counts for the pipeline overview. */
export async function getPipelineStats() {
  const [[regs], [model], [checks], [xw], [reviews], [people]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        jurisdictions: sql<number>`count(distinct ${regulations.jurisdiction})::int`,
      })
      .from(regulations),
    db
      .select({
        areas: sql<number>`(select count(*) from ${areas})::int`,
        subAreas: sql<number>`(select count(*) from ${subAreas})::int`,
      })
      .from(sql`(select 1) as one`),
    db
      .select({
        total: sql<number>`count(*) filter (where ${refChecks.status} <> 'retired')::int`,
        approved: sql<number>`count(*) filter (where ${refChecks.status} = 'approved')::int`,
        draft: sql<number>`count(*) filter (where ${refChecks.status} = 'draft')::int`,
        retired: sql<number>`count(*) filter (where ${refChecks.status} = 'retired')::int`,
      })
      .from(refChecks),
    db
      .select({
        total: sql<number>`count(*)::int`,
        linked: sql<number>`count(${crosswalks.regulationId})::int`,
        regulationsCited: sql<number>`count(distinct ${crosswalks.regulationId})::int`,
      })
      .from(crosswalks),
    db.select({ total: sql<number>`count(*)::int` }).from(checkReviews),
    db.select({ total: sql<number>`count(*)::int` }).from(users),
  ]);
  return { regs, model, checks, xw, reviews, people };
}

export async function listUsers() {
  return db
    .select({ id: users.id, email: users.email, name: users.name, roles: users.roles, createdAt: users.createdAt })
    .from(users)
    .orderBy(asc(users.name));
}
