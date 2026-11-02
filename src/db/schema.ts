import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const ROLES = ["viewer", "check_owner", "mapping_approver", "library_owner", "company_admin"] as const;
export type Role = (typeof ROLES)[number];

export const checkStatus = pgEnum("ref_check_status", ["draft", "approved", "retired"]);
export const reviewDecision = pgEnum("review_decision", ["approve", "reject", "edit", "retire", "reopen"]);

/** Named people. Approvals and edits record who did them. */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  roles: text("roles").array().notNull().default(sql`'{}'::text[]`),
  // scrypt: "salt:hash", both hex.
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Single-row table describing the regulatory corpus snapshot. */
export const corpus = pgTable("corpus", {
  id: integer("id").primaryKey().default(1),
  // YYYY-MM or YYYY-MM-DD, as given in data/regulations.json.
  asOf: text("as_of").notNull(),
  note: text("note"),
});

/** The 12 frozen PV system areas. `code` never changes once mappings exist. */
export const areas = pgTable("areas", {
  code: text("code").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

/** Frozen sub-areas, e.g. "ICSR.4". */
export const subAreas = pgTable("sub_areas", {
  code: text("code").primaryKey(),
  areaCode: text("area_code")
    .notNull()
    .references(() => areas.code),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

/**
 * Profile predicates a check depends on. Every key given must match:
 * markets and product_types are any-of, requires is all-of. null = any company.
 */
export type Applicability = {
  markets?: string[];
  product_types?: string[];
  requires?: string[];
} | null;

/** Current version of each check in the reference library. */
export const refChecks = pgTable("ref_checks", {
  checkId: text("check_id").primaryKey(),
  version: integer("version").notNull().default(1),
  subAreaCode: text("subarea_code")
    .notNull()
    .references(() => subAreas.code),
  statement: text("statement").notNull(),
  applicability: jsonb("applicability").$type<Applicability>(),
  inspectorEvidence: text("inspector_evidence").array().notNull().default(sql`'{}'::text[]`),
  status: checkStatus("status").notNull().default("draft"),
  draftedBy: text("drafted_by"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every wording a check has had. The current one is also in ref_checks. */
export const checkVersions = pgTable(
  "check_versions",
  {
    checkId: text("check_id")
      .notNull()
      .references(() => refChecks.checkId),
    version: integer("version").notNull(),
    statement: text("statement").notNull(),
    applicability: jsonb("applicability").$type<Applicability>(),
    inspectorEvidence: text("inspector_evidence").array().notNull().default(sql`'{}'::text[]`),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.checkId, t.version] })],
);

/** Review decisions on checks: who, what and when. Never deleted. */
export const checkReviews = pgTable("check_reviews", {
  id: serial("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => refChecks.checkId),
  version: integer("version").notNull(),
  reviewerId: integer("reviewer_id")
    .notNull()
    .references(() => users.id),
  decision: reviewDecision("decision").notNull(),
  comment: text("comment"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Regulatory entries, loaded from data/regulations.json. */
export const regulations = pgTable("regulations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  section: text("section"),
  summary: text("summary").notNull(),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  sourceLabel: text("source_label"),
  // YYYY-MM or YYYY-MM-DD. Same-precision values sort correctly as text.
  asOf: text("as_of").notNull(),
});

/** Link from a check to the requirement it rests on. regulation_id is optional. */
export const crosswalks = pgTable("crosswalks", {
  id: serial("id").primaryKey(),
  checkId: text("check_id")
    .notNull()
    .references(() => refChecks.checkId, { onDelete: "cascade" }),
  regulationId: text("regulation_id").references(() => regulations.id, { onDelete: "set null" }),
  citationText: text("citation_text").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
});

export type User = typeof users.$inferSelect;
export type Area = typeof areas.$inferSelect;
export type SubArea = typeof subAreas.$inferSelect;
export type RefCheck = typeof refChecks.$inferSelect;
export type Regulation = typeof regulations.$inferSelect;
