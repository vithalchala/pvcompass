// Database tests. They run only when TEST_DATABASE_URL is set, and they wipe the
// library tables there, so never point it at a database you care about.
import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";

const url = process.env.TEST_DATABASE_URL;

describe("check library sync and review", { skip: !url && "TEST_DATABASE_URL not set" }, () => {
  let db: any;
  let schema: typeof import("../src/db/schema");
  let lib: typeof import("../src/db/library-file");
  let review: typeof import("../src/lib/check-review");
  let client: { end: () => Promise<void> };
  let owner: { id: number; name: string; roles: string[] };
  let viewer: { id: number; name: string; roles: string[] };

  const model = {
    areas: [
      { code: "ICSR", name: "ICSR", description: "d", sub_areas: [{ code: "ICSR.1", name: "Intake", description: "d" }] },
    ],
  };
  const library = (statement = "Cases are logged on receipt.") => ({
    drafted_by: "test draft",
    checks: [
      {
        check_id: "ICSR-01",
        subarea_code: "ICSR.1",
        statement,
        applicability: null,
        inspector_evidence: ["Intake log"],
        crosswalks: [{ citation: "GVP Module VI", jurisdiction: "EU" }],
      },
    ],
  });
  const current = async () => (await db.select().from(schema.refChecks))[0];

  before(async () => {
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    schema = await import("../src/db/schema");
    lib = await import("../src/db/library-file");
    review = await import("../src/lib/check-review");
    const pg = postgres(url!, { max: 1, onnotice: () => {} });
    client = pg;
    db = drizzle(pg, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
  });

  beforeEach(async () => {
    for (const t of [schema.checkReviews, schema.checkVersions, schema.crosswalks, schema.refChecks, schema.subAreas, schema.areas, schema.users]) {
      await db.delete(t);
    }
    const [o, v] = await db
      .insert(schema.users)
      .values([
        { email: "owner@x.test", name: "Owner", roles: ["library_owner"], passwordHash: "x" },
        { email: "viewer@x.test", name: "Viewer", roles: ["viewer"], passwordHash: "x" },
      ])
      .returning();
    owner = o;
    viewer = v;
    await lib.syncLibrary(db, model, library());
  });

  after(() => client?.end());

  it("loads new checks as version 1 drafts", async () => {
    const c = await current();
    assert.equal(c.version, 1);
    assert.equal(c.status, "draft");
  });

  it("re-running the sync with an unchanged file changes nothing", async () => {
    const report = await lib.syncLibrary(db, model, library());
    assert.equal(report.unchanged, 1);
    assert.equal((await current()).version, 1);
  });

  it("records the named approver", async () => {
    assert.equal(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "approve" }), null);
    const c = await current();
    assert.equal(c.status, "approved");
    assert.equal(c.approvedBy, owner.id);
    const reviews = await db.select().from(schema.checkReviews);
    assert.equal(reviews.length, 1);
    assert.equal(reviews[0].reviewerId, owner.id);
  });

  it("refuses reviewers without the library-owner role", async () => {
    assert.match(String(await review.applyDecision(db, viewer, "ICSR-01", 1, { kind: "approve" })), /library owner/);
    assert.equal((await current()).status, "draft");
  });

  it("refuses a decision on a stale version", async () => {
    assert.match(String(await review.applyDecision(db, owner, "ICSR-01", 2, { kind: "approve" })), /changed/);
  });

  it("requires a comment to reject, and rejection returns an approved check to draft", async () => {
    await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "approve" });
    assert.match(String(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "reject", comment: " " })), /comment/);
    assert.equal(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "reject", comment: "Too vague" }), null);
    const c = await current();
    assert.equal(c.status, "draft");
    assert.equal(c.approvedBy, null);
  });

  it("an edit creates a new version, back in draft, and keeps the old wording", async () => {
    await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "approve" });
    const err = await review.applyDecision(db, owner, "ICSR-01", 1, {
      kind: "edit",
      statement: "All cases are logged on the day of receipt.",
      inspectorEvidence: ["Intake log", ""],
    });
    assert.equal(err, null);
    const c = await current();
    assert.equal(c.version, 2);
    assert.equal(c.status, "draft");
    assert.deepEqual(c.inspectorEvidence, ["Intake log"]);
    const versions = await db.select().from(schema.checkVersions);
    assert.deepEqual(versions.map((v: { version: number }) => v.version).sort(), [1, 2]);
  });

  it("keeps an in-app edit when the file has not changed, and versions the check when it has", async () => {
    await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "edit", statement: "Edited in app.", inspectorEvidence: ["Intake log"] });
    await lib.syncLibrary(db, model, library());
    assert.equal((await current()).statement, "Edited in app.");

    await review.applyDecision(db, owner, "ICSR-01", 2, { kind: "approve" });
    const report = await lib.syncLibrary(db, model, library("Changed in the file."));
    assert.equal(report.revised, 1);
    const c = await current();
    assert.equal(c.version, 3);
    assert.equal(c.statement, "Changed in the file.");
    assert.equal(c.status, "draft");
  });

  it("retires with a reason and can reopen", async () => {
    assert.match(String(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "retire" })), /reason/);
    assert.equal(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "retire", comment: "Duplicate" }), null);
    assert.equal((await current()).status, "retired");
    assert.equal(await review.applyDecision(db, owner, "ICSR-01", 1, { kind: "reopen" }), null);
    assert.equal((await current()).status, "draft");
  });
});
