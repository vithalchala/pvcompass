import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { readRegulationsFile } from "../src/db/regulations-file";

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
        "entry 0 (r1): as_of must be YYYY-MM-DD",
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
