import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { existsSync } from "node:fs";
import { readRegulationsFile, REGULATIONS_FILE } from "../src/db/regulations-file";

async function fileWith(content: unknown) {
  const dir = await mkdtemp(path.join(tmpdir(), "pvc-"));
  const file = path.join(dir, "regulations.json");
  await writeFile(file, typeof content === "string" ? content : JSON.stringify(content));
  return file;
}

const valid = {
  id: "r1",
  title: "Title",
  jurisdiction: "EU",
  section: "1.2",
  summary: "Summary",
  tags: [" a ", "b", ""],
  source_label: "Source",
  as_of: "2026-10-01",
};

describe("readRegulationsFile", () => {
  it("maps fields and trims values", async () => {
    const rows = await readRegulationsFile(await fileWith([{ ...valid, title: "  Title  " }]));
    assert.deepEqual(rows, [
      {
        id: "r1",
        title: "Title",
        jurisdiction: "EU",
        section: "1.2",
        summary: "Summary",
        tags: ["a", "b"],
        sourceLabel: "Source",
        asOf: "2026-10-01",
      },
    ]);
  });

  it("allows section, source_label and tags to be missing or null", async () => {
    const { section, source_label, tags, ...rest } = valid;
    const [row] = await readRegulationsFile(await fileWith([{ ...rest, section: null }]));
    assert.equal(row.section, null);
    assert.equal(row.sourceLabel, null);
    assert.deepEqual(row.tags, []);
  });

  it("accepts month-only and full dates, rejects impossible ones", async () => {
    const ok = await readRegulationsFile(await fileWith([{ ...valid, as_of: "2026-09" }]));
    assert.equal(ok[0].asOf, "2026-09");
    for (const bad of ["2026-13", "2026-9", "2026-09-32", "2026"]) {
      await assert.rejects(readRegulationsFile(await fileWith([{ ...valid, as_of: bad }])), /as_of must be/);
    }
  });

  it("ignores fields it does not know, such as subsection", async () => {
    const [row] = await readRegulationsFile(await fileWith([{ ...valid, subsection: "x" }]));
    assert.ok(!("subsection" in row));
  });

  it("rejects a file that is not an array", async () => {
    await assert.rejects(readRegulationsFile(await fileWith({ ...valid })), /expected a JSON array/);
  });

  it("rejects invalid JSON", async () => {
    await assert.rejects(readRegulationsFile(await fileWith("[{")), SyntaxError);
  });

  it("lists every problem and loads nothing", async () => {
    const file = await fileWith([
      { ...valid, as_of: "01/10/2026", tags: "x" },
      { id: "r1", title: 5 },
    ]);
    await assert.rejects(readRegulationsFile(file), (err: Error) => {
      for (const problem of [
        "entry 0 (r1): as_of must be YYYY-MM or YYYY-MM-DD",
        "entry 0 (r1): tags must be an array of strings",
        "entry 1 (r1): title must be a string",
        "entry 1 (r1): missing jurisdiction",
        "entry 1 (r1): missing summary",
        "entry 1 (r1): missing as_of",
        "entry 1 (r1): duplicate id",
      ]) {
        assert.ok(err.message.includes(problem), `expected "${problem}" in:\n${err.message}`);
      }
      return true;
    });
  });
});

describe("data/regulations.json", { skip: !existsSync(REGULATIONS_FILE) && "file not present" }, () => {
  it("passes validation", async () => {
    const rows = await readRegulationsFile();
    assert.ok(rows.length > 0);
  });
});
