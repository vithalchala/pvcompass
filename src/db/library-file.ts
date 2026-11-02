import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import type { Applicability } from "./schema";

export const REFERENCE_MODEL_FILE = path.join(process.cwd(), "data", "reference-model.json");
export const CHECKS_FILE = path.join(process.cwd(), "data", "checks.json");

export const MARKETS = ["US", "EU", "UK", "CA", "JP", "CN", "AU", "BR", "IN", "KR", "GCC", "ASEAN"];
export const PRODUCT_TYPES = ["marketed", "IND", "biologic", "vaccine", "device_combination", "radiopharmaceutical", "atmp"];
export const REQUIRES = [
  "sdea_partners",
  "vendor_performed",
  "rems",
  "armm",
  "eu_qppv",
  "uk_qppv",
  "psmf",
  "active_trials",
  "local_pv_contacts",
  "patient_programmes",
];

export type ModelSubArea = { code: string; name: string; description: string };
export type ModelArea = { code: string; name: string; description: string; sub_areas: ModelSubArea[] };
export type ReferenceModel = { areas: ModelArea[] };

export type FileCrosswalk = { citation: string; jurisdiction: string; regulation_id?: string };
export type FileCheck = {
  check_id: string;
  subarea_code: string;
  statement: string;
  applicability: Applicability;
  inspector_evidence: string[];
  crosswalks: FileCrosswalk[];
};
export type CheckLibrary = { drafted_by: string; checks: FileCheck[] };

const CHECK_ID = /^([A-Z]{3,4})-(\d{2})$/;
const SUBAREA_CODE = /^([A-Z]{3,4})\.(\d+)$/;

const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string" && x.trim() !== "");

/**
 * Check the reference model and check library together. Returns every problem
 * found; an empty list means both files are safe to load.
 */
export function validateLibrary(model: unknown, library: unknown, regulationIds: Set<string>): string[] {
  const errors: string[] = [];
  const subAreaOf = new Map<string, string>(); // sub-area code -> area code

  const m = model as Partial<ReferenceModel> | null;
  if (!m || !Array.isArray(m.areas)) {
    errors.push("reference model: expected { areas: [...] }");
  } else {
    const areaCodes = new Set<string>();
    for (const [i, a] of m.areas.entries()) {
      const at = `area ${i} (${a?.code ?? "?"})`;
      if (!a?.code || !/^[A-Z]{3,4}$/.test(a.code)) errors.push(`${at}: code must be 3-4 capital letters`);
      if (!a?.name || !a?.description) errors.push(`${at}: name and description are required`);
      if (areaCodes.has(a.code)) errors.push(`${at}: duplicate area code`);
      areaCodes.add(a.code);
      if (!Array.isArray(a?.sub_areas) || a.sub_areas.length === 0) {
        errors.push(`${at}: needs at least one sub-area`);
        continue;
      }
      for (const [j, s] of a.sub_areas.entries()) {
        const sm = SUBAREA_CODE.exec(s?.code ?? "");
        if (!sm || sm[1] !== a.code || Number(sm[2]) !== j + 1) {
          errors.push(`${at}: sub-area ${j} must have code ${a.code}.${j + 1}, got "${s?.code}"`);
        }
        if (!s?.name || !s?.description) errors.push(`${at}: sub-area ${s?.code}: name and description are required`);
        if (s?.code) subAreaOf.set(s.code, a.code);
      }
    }
  }

  const lib = library as Partial<CheckLibrary> | null;
  if (!lib || !Array.isArray(lib.checks)) {
    errors.push("check library: expected { checks: [...] }");
    return errors;
  }

  const seen = new Set<string>();
  const numbersByArea = new Map<string, number[]>();
  for (const [i, c] of lib.checks.entries()) {
    const at = `check ${i} (${c?.check_id ?? "?"})`;
    const idm = CHECK_ID.exec(c?.check_id ?? "");
    if (!idm) {
      errors.push(`${at}: check_id must look like ICSR-07`);
      continue;
    }
    if (seen.has(c.check_id)) errors.push(`${at}: duplicate check_id`);
    seen.add(c.check_id);

    const area = subAreaOf.get(c.subarea_code);
    if (!area) errors.push(`${at}: unknown subarea_code "${c.subarea_code}"`);
    else if (area !== idm[1]) errors.push(`${at}: id prefix ${idm[1]} does not match sub-area ${c.subarea_code}`);
    numbersByArea.set(idm[1], [...(numbersByArea.get(idm[1]) ?? []), Number(idm[2])]);

    if (typeof c.statement !== "string" || c.statement.trim() === "") errors.push(`${at}: statement is required`);
    if (!isStrArray(c.inspector_evidence) || c.inspector_evidence.length === 0) {
      errors.push(`${at}: inspector_evidence must be a non-empty array of strings`);
    }

    const ap = c.applicability;
    if (ap !== null) {
      if (typeof ap !== "object" || Array.isArray(ap)) {
        errors.push(`${at}: applicability must be null or an object`);
      } else {
        const allowed: Record<string, string[]> = { markets: MARKETS, product_types: PRODUCT_TYPES, requires: REQUIRES };
        for (const [key, value] of Object.entries(ap)) {
          if (!(key in allowed)) errors.push(`${at}: unknown applicability key "${key}"`);
          else if (!isStrArray(value) || value.length === 0) errors.push(`${at}: applicability.${key} must be a non-empty array`);
          else for (const v of value) if (!allowed[key].includes(v)) errors.push(`${at}: applicability.${key} has unknown value "${v}"`);
        }
      }
    }

    if (!Array.isArray(c.crosswalks) || c.crosswalks.length === 0) {
      errors.push(`${at}: needs at least one crosswalk`);
    } else {
      for (const x of c.crosswalks) {
        if (!x?.citation || !x?.jurisdiction) errors.push(`${at}: crosswalk needs citation and jurisdiction`);
        if (x?.regulation_id && !regulationIds.has(x.regulation_id)) {
          errors.push(`${at}: crosswalk regulation_id "${x.regulation_id}" is not in regulations.json`);
        }
      }
    }
  }

  for (const [area, nums] of numbersByArea) {
    const sorted = [...nums].sort((a, b) => a - b);
    sorted.forEach((n, i) => {
      if (n !== i + 1) errors.push(`${area}: check numbers must run 01..${String(sorted.length).padStart(2, "0")} with no gaps`);
    });
  }
  return [...new Set(errors)];
}

export async function readLibraryFiles(modelFile = REFERENCE_MODEL_FILE, checksFile = CHECKS_FILE) {
  const model = JSON.parse(await readFile(modelFile, "utf8")) as ReferenceModel;
  const library = JSON.parse(await readFile(checksFile, "utf8")) as CheckLibrary;
  return { model, library };
}

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

/** The parts of a check whose change makes a new version. */
export function checkContent(c: {
  statement: string;
  applicability: Applicability;
  inspectorEvidence: string[];
}) {
  return JSON.stringify([c.statement.trim(), c.applicability ?? null, c.inspectorEvidence]);
}

export type SyncReport = { areas: number; subAreas: number; added: number; revised: number; unchanged: number };

/**
 * Load the reference model and check library into the database.
 *
 * Re-runnable: areas and sub-areas are upserted by code. A check that is new
 * gets version 1 as a draft. A check whose file content differs from the last
 * version loaded from the file gets a new version and returns to draft; edits
 * made in the app are left alone while the file is unchanged. Crosswalks are
 * replaced from the file. Nothing is deleted.
 */
export async function syncLibrary(db: Db, model: ReferenceModel, library: CheckLibrary): Promise<SyncReport> {
  const report: SyncReport = { areas: 0, subAreas: 0, added: 0, revised: 0, unchanged: 0 };

  for (const [ai, a] of model.areas.entries()) {
    const area = { code: a.code, number: ai + 1, name: a.name, description: a.description };
    await db.insert(schema.areas).values(area).onConflictDoUpdate({ target: schema.areas.code, set: area });
    report.areas++;
    for (const [si, s] of a.sub_areas.entries()) {
      const sub = { code: s.code, areaCode: a.code, number: si + 1, name: s.name, description: s.description };
      await db.insert(schema.subAreas).values(sub).onConflictDoUpdate({ target: schema.subAreas.code, set: sub });
      report.subAreas++;
    }
  }

  const ids = library.checks.map((c) => c.check_id);
  const existing = ids.length
    ? await db.select().from(schema.refChecks).where(inArray(schema.refChecks.checkId, ids))
    : [];
  const byId = new Map(existing.map((r) => [r.checkId, r]));

  for (const c of library.checks) {
    const content = {
      statement: c.statement.trim(),
      applicability: c.applicability ?? null,
      inspectorEvidence: c.inspector_evidence.map((e) => e.trim()),
    };
    const current = byId.get(c.check_id);

    if (!current) {
      await db.insert(schema.refChecks).values({
        checkId: c.check_id,
        version: 1,
        subAreaCode: c.subarea_code,
        ...content,
        status: "draft",
        draftedBy: library.drafted_by,
      });
      await db.insert(schema.checkVersions).values({ checkId: c.check_id, version: 1, ...content, source: "file" });
      report.added++;
    } else {
      const [lastFromFile] = await db
        .select()
        .from(schema.checkVersions)
        .where(and(eq(schema.checkVersions.checkId, c.check_id), eq(schema.checkVersions.source, "file")))
        .orderBy(desc(schema.checkVersions.version))
        .limit(1);
      const fileChanged = !lastFromFile || checkContent(lastFromFile) !== checkContent(content);
      if (fileChanged) {
        const version = current.version + 1;
        await db
          .update(schema.refChecks)
          .set({
            version,
            subAreaCode: c.subarea_code,
            ...content,
            status: "draft",
            draftedBy: library.drafted_by,
            approvedBy: null,
            approvedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.refChecks.checkId, c.check_id));
        await db.insert(schema.checkVersions).values({ checkId: c.check_id, version, ...content, source: "file" });
        report.revised++;
      } else {
        report.unchanged++;
      }
    }

    await db.delete(schema.crosswalks).where(eq(schema.crosswalks.checkId, c.check_id));
    await db.insert(schema.crosswalks).values(
      c.crosswalks.map((x) => ({
        checkId: c.check_id,
        regulationId: x.regulation_id ?? null,
        citationText: x.citation.trim(),
        jurisdiction: x.jurisdiction.trim(),
      })),
    );
  }
  return report;
}
