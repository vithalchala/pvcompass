// Illustrative starter corpus. Replace with the curated library before use.

type SeedCheck = { question: string; guidance: string; regs: string[] };
type SeedSubArea = { name: string; description: string; checks: SeedCheck[] };
type SeedArea = { code: string; name: string; description: string; subAreas: SeedSubArea[] };

// Regulations themselves come from data/regulations.json. The `regs` ids on each
// check are linked only when that id exists in the file.
const REG = {
  gvpI: "gvp-module-i-pharmacovigilance-systems-and-quality-systems",
  gvpII: "gvp-module-ii-pharmacovigilance-system-master-file-psmf",
  gvpIII: "gvp-module-iii-pharmacovigilance-inspections",
  gvpIV: "gvp-module-iv-pharmacovigilance-audits",
  gvpV: "gvp-module-v-risk-management-systems",
  gvpVI: "gvp-module-vi-collection-management-and-submission-of-adrs",
  gvpVII: "gvp-module-vii-periodic-safety-update-reports",
  gvpIX: "gvp-module-ix-signal-management",
  gvpXtoXVI: "gvp-modules-x-xvi-additional-monitoring-through-risk-minimisation-effectiveness",
  euPvLegislation: "regulation-eu-no-1235-2010-directive-2010-84-eu-eu-pv-legislation",
  cfr314: "21-cfr-part-314-nda-post-marketing-safety-reporting",
  ichE2B: "ich-e2b-r3-electronic-transmission-of-icsrs",
  ichE2C: "ich-e2c-r2-periodic-benefit-risk-evaluation-report-pbrer",
  ichE2D: "ich-e2d-post-approval-safety-data-management",
  ichE2E: "ich-e2e-pharmacovigilance-planning",
  sdea: "safety-data-exchange-agreements-sdeas-contractual-pv-obligations",
};

const sa = (name: string, description: string, checks: SeedCheck[]): SeedSubArea => ({
  name,
  description,
  checks,
});
const ck = (question: string, guidance: string, regs: string[]): SeedCheck => ({
  question,
  guidance,
  regs,
});

export const AREAS: SeedArea[] = [
  {
    code: "PSMF",
    name: "PV System Master File",
    description: "The PSMF, its annexes and how it is kept current.",
    subAreas: [
      sa("Content", "Required sections and annexes.", [
        ck("Does the PSMF contain every section required?", "Map each section to the regulatory list.", [REG.gvpII, REG.euPvLegislation]),
        ck("Are annex lists current?", "Compare against live system records.", [REG.gvpII]),
      ]),
      sa("Maintenance", "Change control and availability.", [
        ck("Is there a logbook of PSMF changes?", "Check dates against known system changes.", [REG.gvpII]),
        ck("Can the PSMF be provided on request in time?", "Run a retrieval drill.", [REG.gvpII, REG.euPvLegislation]),
      ]),
    ],
  },
  {
    code: "QMS",
    name: "Quality Management System",
    description: "Procedures, document control, records and deviations.",
    subAreas: [
      sa("Procedures", "Coverage of PV processes by written procedures.", [
        ck("Is every PV process covered by a current procedure?", "Build a process-to-SOP matrix.", [REG.gvpI, REG.euPvLegislation]),
        ck("Are superseded procedures withdrawn?", "Sample procedures in use at sites.", [REG.gvpI]),
      ]),
      sa("Records", "Retention and retrievability.", [
        ck("Are PV records retained for the required period?", "Check the retention schedule.", [REG.euPvLegislation]),
        ck("Can records be retrieved quickly?", "Pick five cases and time retrieval.", [REG.gvpI]),
      ]),
    ],
  },
  {
    code: "ICSR",
    name: "Individual Case Safety Reports",
    description: "Case intake, processing, follow-up and submission.",
    subAreas: [
      sa("Intake", "All sources reach the safety database.", [
        ck("Are all intake channels reconciled?", "Reconcile call centre, medical information and partners.", [REG.gvpVI]),
        ck("Is day zero recorded consistently?", "Sample cases from each channel.", [REG.gvpVI, REG.cfr314]),
      ]),
      sa("Submission", "Timeliness and format.", [
        ck("Are expedited reports submitted on time?", "Review compliance metrics for the last year.", [REG.gvpVI, REG.cfr314]),
        ck("Do transmissions follow E2B(R3)?", "Check acknowledgements and rejections.", [REG.ichE2B]),
      ]),
    ],
  },
  {
    code: "SIG",
    name: "Signal Management",
    description: "Detection through to assessment and action.",
    subAreas: [
      sa("Detection", "Sources and frequency of review.", [
        ck("Is the detection frequency defined per product?", "Check the signal management plan.", [REG.gvpIX]),
        ck("Are all data sources covered?", "List sources and confirm each is screened.", [REG.gvpIX]),
      ]),
      sa("Assessment", "Validation, prioritisation and decisions.", [
        ck("Is every validated signal tracked to closure?", "Review the signal tracker.", [REG.gvpIX]),
        ck("Are decisions documented with rationale?", "Sample closed signals.", [REG.gvpIX]),
      ]),
    ],
  },
  {
    code: "PSUR",
    name: "Periodic Safety Update Reports",
    description: "PSUR/PBRER planning, authoring and submission.",
    subAreas: [
      sa("Planning", "Schedule and data lock points.", [
        ck("Is the PSUR schedule aligned to reference dates?", "Compare schedule to the reference list.", [REG.gvpVII]),
        ck("Are data lock points met?", "Review the last cycle.", [REG.gvpVII]),
      ]),
      sa("Content", "Structure and quality.", [
        ck("Does content follow the PBRER structure?", "Check a recent report.", [REG.ichE2C, REG.gvpVII]),
        ck("Are commitments from assessments tracked?", "Trace each commitment.", [REG.gvpVII]),
      ]),
    ],
  },
  {
    code: "RMP",
    name: "Risk Management Plans",
    description: "Safety specification and PV plan.",
    subAreas: [
      sa("Content", "Safety specification and plan.", [
        ck("Is each RMP current for its product?", "Compare version to latest approval.", [REG.gvpV]),
        ck("Do safety concerns match the latest data?", "Cross-check with signals and PSURs.", [REG.gvpV, REG.ichE2E]),
      ]),
      sa("Commitments", "Additional PV activities.", [
        ck("Are study milestones tracked?", "Review milestone register.", [REG.gvpV]),
        ck("Are delays notified?", "Check correspondence for late milestones.", [REG.gvpV]),
      ]),
    ],
  },
  {
    code: "ARM",
    name: "Risk Minimisation Measures",
    description: "Additional measures and their effectiveness.",
    subAreas: [
      sa("Implementation", "Rollout in each market.", [
        ck("Is distribution of materials evidenced per market?", "Check distribution records.", [REG.gvpXtoXVI]),
        ck("Are local versions approved?", "Compare to national approvals.", [REG.gvpXtoXVI]),
      ]),
      sa("Effectiveness", "Measuring whether measures work.", [
        ck("Is effectiveness evaluated?", "Look for study or survey results.", [REG.gvpXtoXVI]),
        ck("Do results feed back into the RMP?", "Trace outcomes to RMP updates.", [REG.gvpXtoXVI, REG.gvpV]),
      ]),
    ],
  },
  {
    code: "LIT",
    name: "Literature Monitoring",
    description: "Screening of published and local literature.",
    subAreas: [
      sa("Search", "Strategy and frequency.", [
        ck("Is the search strategy documented per substance?", "Review search strings.", [REG.gvpVI, REG.ichE2D]),
        ck("Is screening at least weekly?", "Check run logs.", [REG.gvpVI]),
      ]),
      sa("Processing", "From article to case.", [
        ck("Are valid cases created from articles?", "Sample screened hits.", [REG.gvpVI]),
        ck("Is local literature covered?", "List local journals by market.", [REG.gvpVI]),
      ]),
    ],
  },
  {
    code: "QPPV",
    name: "QPPV and PV Organisation",
    description: "QPPV role, oversight and deputisation.",
    subAreas: [
      sa("Role", "Responsibilities and authority.", [
        ck("Is the QPPV's authority documented?", "Check job description and org chart.", [REG.gvpI]),
        ck("Is there a back-up arrangement?", "Check deputy procedure.", [REG.gvpI]),
      ]),
      sa("Oversight", "QPPV access to information.", [
        ck("Does the QPPV receive compliance metrics?", "Review recent oversight packs.", [REG.gvpI]),
        ck("Is the QPPV informed of emerging issues?", "Check escalation records.", [REG.gvpI]),
      ]),
    ],
  },
  {
    code: "TRN",
    name: "Training",
    description: "PV training for staff and partners.",
    subAreas: [
      sa("Curricula", "Role-based training.", [
        ck("Does each PV role have a curriculum?", "Map roles to curricula.", [REG.gvpI]),
        ck("Are non-PV staff trained on AE reporting?", "Check onboarding records.", [REG.gvpI]),
      ]),
      sa("Records", "Evidence of completion.", [
        ck("Is training completed before tasks begin?", "Compare training and system access dates.", [REG.gvpI]),
        ck("Are records retrievable for inspectors?", "Pull records for five staff.", [REG.gvpI]),
      ]),
    ],
  },
  {
    code: "PART",
    name: "Contracts and PV Agreements",
    description: "Safety data exchange with partners and vendors.",
    subAreas: [
      sa("Agreements", "Coverage and content.", [
        ck("Does every partner have a current agreement?", "Reconcile partner list to agreements.", [REG.sdea, REG.gvpI]),
        ck("Are exchange timelines defined?", "Review sample agreements.", [REG.sdea, REG.gvpVI]),
      ]),
      sa("Oversight", "Monitoring partner performance.", [
        ck("Is partner compliance reconciled?", "Check reconciliation records.", [REG.gvpI]),
        ck("Are partners audited on a risk basis?", "Compare audit plan to partner risk.", [REG.gvpIV]),
      ]),
    ],
  },
  {
    code: "AUD",
    name: "Audits and CAPA",
    description: "Audit programme, findings and corrective actions.",
    subAreas: [
      sa("Programme", "Risk-based audit plan.", [
        ck("Is there a risk-based audit plan?", "Review the plan and its rationale.", [REG.gvpIV]),
        ck("Are audit reports issued on time?", "Check report dates.", [REG.gvpIV]),
      ]),
      sa("CAPA", "Corrective and preventive action.", [
        ck("Are CAPAs closed on time?", "Review CAPA ageing.", [REG.gvpIV, REG.gvpI]),
        ck("Is effectiveness of CAPA verified?", "Sample closed CAPAs.", [REG.gvpIV]),
      ]),
    ],
  },
];
