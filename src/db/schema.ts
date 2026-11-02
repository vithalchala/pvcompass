import { sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const checkStatus = pgEnum("check_status", ["pending", "approved", "rejected"]);

/** Single-row table describing the regulatory corpus snapshot. */
export const corpus = pgTable("corpus", {
  id: integer("id").primaryKey().default(1),
  // YYYY-MM or YYYY-MM-DD, as given in data/regulations.json.
  asOf: text("as_of").notNull(),
  note: text("note"),
});

/** The 12 PV system areas. `code` is short and URL-safe, e.g. "ICSR". */
export const areas = pgTable("areas", {
  code: text("code").primaryKey(),
  number: integer("number").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const subAreas = pgTable("sub_areas", {
  id: serial("id").primaryKey(),
  areaCode: text("area_code")
    .notNull()
    .references(() => areas.code, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
});

export const checks = pgTable("checks", {
  id: serial("id").primaryKey(),
  subAreaId: integer("sub_area_id")
    .notNull()
    .references(() => subAreas.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  question: text("question").notNull(),
  guidance: text("guidance").notNull(),
  status: checkStatus("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
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

export const checkRegulations = pgTable(
  "check_regulations",
  {
    checkId: integer("check_id")
      .notNull()
      .references(() => checks.id, { onDelete: "cascade" }),
    regulationId: text("regulation_id")
      .notNull()
      .references(() => regulations.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.checkId, t.regulationId] })],
);

export type Area = typeof areas.$inferSelect;
export type SubArea = typeof subAreas.$inferSelect;
export type Check = typeof checks.$inferSelect;
export type Regulation = typeof regulations.$inferSelect;
