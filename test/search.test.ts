// Database tests. They run only when TEST_DATABASE_URL is set, and they wipe the
// regulations table there, so never point it at a database you care about.
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

const url = process.env.TEST_DATABASE_URL;

describe("searchRegulations", { skip: !url && "TEST_DATABASE_URL not set" }, () => {
  let q: typeof import("../src/lib/queries");
  let close: () => Promise<void>;

  before(async () => {
    process.env.DATABASE_URL = url;
    const { default: postgres } = await import("postgres");
    const { drizzle } = await import("drizzle-orm/postgres-js");
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const schema = await import("../src/db/schema");
    const { syncRegulations } = await import("../src/db/regulations-file");

    const client = postgres(url!, { max: 1, onnotice: () => {} });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await syncRegulations(db, [
      { id: "a", title: "Signal management", jurisdiction: "EU", section: "IX.B", summary: "Detect signals.", tags: ["signals"], sourceLabel: "GVP", asOf: "2026-01-01" },
      { id: "b", title: "Case reports", jurisdiction: "US", section: "314.80", summary: "15-day reports.", tags: ["icsr", "expedited"], sourceLabel: "CFR", asOf: "2026-03-01" },
      { id: "c", title: "Planning", jurisdiction: "EU", section: null, summary: "100% of products.", tags: [], sourceLabel: null, asOf: "2026-02-01" },
    ]);
    await client.end();

    q = await import("../src/lib/queries");
    const { db: appDb } = await import("../src/db");
    close = () => (appDb.$client as { end: () => Promise<void> }).end();
  });

  after(() => close?.());

  const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

  it("returns everything for an empty or blank query", async () => {
    assert.deepEqual(ids(await q.searchRegulations("")), ["a", "b", "c"]);
    assert.deepEqual(ids(await q.searchRegulations("   ")), ["a", "b", "c"]);
  });

  it("matches title, summary, section, source label and tags, ignoring case", async () => {
    assert.deepEqual(ids(await q.searchRegulations("SIGNAL")), ["a"]);
    assert.deepEqual(ids(await q.searchRegulations("15-day")), ["b"]);
    assert.deepEqual(ids(await q.searchRegulations("314.80")), ["b"]);
    assert.deepEqual(ids(await q.searchRegulations("gvp")), ["a"]);
    assert.deepEqual(ids(await q.searchRegulations("expedited")), ["b"]);
  });

  it("treats % and _ literally", async () => {
    assert.deepEqual(ids(await q.searchRegulations("%")), ["c"]);
    assert.deepEqual(ids(await q.searchRegulations("_")), []);
  });

  it("filters by jurisdiction, alone and with a query", async () => {
    assert.deepEqual(ids(await q.searchRegulations("", "EU")), ["a", "c"]);
    assert.deepEqual(ids(await q.searchRegulations("signal", "US")), []);
    assert.deepEqual(await q.listJurisdictions(), ["EU", "US"]);
  });

  it("sets the corpus date to the newest as_of", async () => {
    assert.equal(await q.getCorpusAsOf(), "2026-03-01");
  });
});
