import { eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "@/db/schema";

type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type Decision =
  | { kind: "approve"; comment?: string }
  | { kind: "reject"; comment: string }
  | { kind: "edit"; statement: string; inspectorEvidence: string[]; comment?: string }
  | { kind: "retire"; comment: string }
  | { kind: "reopen"; comment?: string };

export type Reviewer = { id: number; name: string; roles: string[] };

/**
 * Apply one review decision to a check, recording who made it. `version` is the
 * version the reviewer was looking at; a decision on a stale version is refused.
 * Returns an error message, or null on success.
 */
export async function applyDecision(
  db: Db,
  reviewer: Reviewer,
  checkId: string,
  version: number,
  d: Decision,
): Promise<string | null> {
  if (!reviewer.roles.includes("library_owner")) return "Only the check-library owner can review checks.";

  return db.transaction(async (tx) => {
    const [check] = await tx.select().from(schema.refChecks).where(eq(schema.refChecks.checkId, checkId)).for("update");
    if (!check) return `No check ${checkId}.`;
    if (check.version !== version) return `${checkId} changed (now v${check.version}) since you opened it. Reload and review again.`;

    const comment = d.comment?.trim() || null;
    const now = new Date();
    const record = (decision: Decision["kind"], v = version) =>
      tx.insert(schema.checkReviews).values({ checkId, version: v, reviewerId: reviewer.id, decision, comment, decidedAt: now });

    switch (d.kind) {
      case "approve":
        if (check.status !== "draft") return `${checkId} is ${check.status}; only drafts can be approved.`;
        await tx
          .update(schema.refChecks)
          .set({ status: "approved", approvedBy: reviewer.id, approvedAt: now, updatedAt: now })
          .where(eq(schema.refChecks.checkId, checkId));
        await record("approve");
        return null;

      case "reject":
        if (!comment) return "A rejection needs a comment saying what is wrong.";
        if (check.status === "retired") return `${checkId} is retired.`;
        await tx
          .update(schema.refChecks)
          .set({ status: "draft", approvedBy: null, approvedAt: null, updatedAt: now })
          .where(eq(schema.refChecks.checkId, checkId));
        await record("reject");
        return null;

      case "edit": {
        const statement = d.statement.trim();
        const inspectorEvidence = d.inspectorEvidence.map((e) => e.trim()).filter(Boolean);
        if (!statement) return "The statement cannot be empty.";
        if (inspectorEvidence.length === 0) return "List at least one item of inspector evidence.";
        if (statement === check.statement && JSON.stringify(inspectorEvidence) === JSON.stringify(check.inspectorEvidence)) {
          return "Nothing changed.";
        }
        const next = version + 1;
        await tx
          .update(schema.refChecks)
          .set({ version: next, statement, inspectorEvidence, status: "draft", approvedBy: null, approvedAt: null, updatedAt: now })
          .where(eq(schema.refChecks.checkId, checkId));
        await tx.insert(schema.checkVersions).values({
          checkId,
          version: next,
          statement,
          applicability: check.applicability,
          inspectorEvidence,
          source: `edited by ${reviewer.name}`,
          createdAt: now,
        });
        await record("edit", next);
        return null;
      }

      case "retire":
        if (!comment) return "Retiring a check needs a reason.";
        if (check.status === "retired") return `${checkId} is already retired.`;
        await tx
          .update(schema.refChecks)
          .set({ status: "retired", approvedBy: null, approvedAt: null, updatedAt: now })
          .where(eq(schema.refChecks.checkId, checkId));
        await record("retire");
        return null;

      case "reopen":
        if (check.status !== "retired") return `${checkId} is not retired.`;
        await tx.update(schema.refChecks).set({ status: "draft", updatedAt: now }).where(eq(schema.refChecks.checkId, checkId));
        await record("reopen");
        return null;
    }
  });
}
