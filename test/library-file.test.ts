import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readLibraryFiles, validateLibrary } from "../src/db/library-file";
import { readRegulationsFile } from "../src/db/regulations-file";

const model = {
  areas: [
    {
      code: "ICSR",
      name: "ICSR management",
      description: "Cases.",
      sub_areas: [
        { code: "ICSR.1", name: "Intake", description: "Intake." },
        { code: "ICSR.2", name: "Submission", description: "Submission." },
      ],
    },
  ],
};

const check = (over: Record<string, unknown> = {}) => ({
  check_id: "ICSR-01",
  subarea_code: "ICSR.1",
  statement: "Cases are logged on receipt.",
  applicability: null,
  inspector_evidence: ["Intake log"],
  crosswalks: [{ citation: "GVP Module VI", jurisdiction: "EU", regulation_id: "gvp-vi" }],
  ...over,
});

const regs = new Set(["gvp-vi"]);
const lib = (...checks: unknown[]) => ({ drafted_by: "test", checks });

describe("validateLibrary", () => {
  it("accepts a well-formed library", () => {
    assert.deepEqual(validateLibrary(model, lib(check(), check({ check_id: "ICSR-02", subarea_code: "ICSR.2" })), regs), []);
  });

  it("rejects unknown sub-areas and a prefix that does not match the area", () => {
    const errors = validateLibrary(model, lib(check({ subarea_code: "ICSR.9" }), check({ check_id: "SIG-01" })), regs);
    assert.ok(errors.some((e) => e.includes('unknown subarea_code "ICSR.9"')));
    assert.ok(errors.some((e) => e.includes("id prefix SIG does not match sub-area ICSR.1")));
  });

  it("rejects duplicate ids and gaps in numbering", () => {
    assert.ok(validateLibrary(model, lib(check(), check()), regs).some((e) => e.includes("duplicate check_id")));
    assert.ok(validateLibrary(model, lib(check({ check_id: "ICSR-02" })), regs).some((e) => e.includes("no gaps")));
  });

  it("rejects a crosswalk to a regulation that is not in the corpus", () => {
    const bad = check({ crosswalks: [{ citation: "X", jurisdiction: "EU", regulation_id: "missing" }] });
    assert.ok(validateLibrary(model, lib(bad), regs).some((e) => e.includes('"missing" is not in regulations.json')));
  });

  it("allows a crosswalk without a regulation id", () => {
    assert.deepEqual(validateLibrary(model, lib(check({ crosswalks: [{ citation: "UK GPvP", jurisdiction: "UK" }] })), regs), []);
  });

  it("checks applicability keys and values", () => {
    const errors = validateLibrary(
      model,
      lib(check({ applicability: { markets: ["MARS"], colour: ["red"], requires: [] } })),
      regs,
    );
    assert.ok(errors.some((e) => e.includes('unknown value "MARS"')));
    assert.ok(errors.some((e) => e.includes('unknown applicability key "colour"')));
    assert.ok(errors.some((e) => e.includes("applicability.requires must be a non-empty array")));
  });

  it("requires sub-area codes to follow the area code in order", () => {
    const shuffled = { areas: [{ ...model.areas[0], sub_areas: [model.areas[0].sub_areas[1], model.areas[0].sub_areas[0]] }] };
    assert.ok(validateLibrary(shuffled, lib(), regs).some((e) => e.includes("must have code ICSR.1")));
  });
});

describe("data/reference-model.json and data/checks.json", () => {
  it("pass validation against data/regulations.json", async () => {
    const { model: m, library } = await readLibraryFiles();
    const ids = new Set((await readRegulationsFile()).map((r) => r.id));
    assert.deepEqual(validateLibrary(m, library, ids), []);
    assert.equal(m.areas.length, 12);
  });

  it("contain the six illustrative checks from the build specification", async () => {
    const { library } = await readLibraryFiles();
    const ids = new Set(library.checks.map((c) => c.check_id));
    for (const id of ["QMS-01", "ICSR-03", "ICSR-07", "AGG-03", "PVA-05", "CTS-02"]) assert.ok(ids.has(id), id);
  });
});
