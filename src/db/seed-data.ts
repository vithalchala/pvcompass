// Illustrative starter corpus. Replace with the curated library before use.

type SeedCheck = { question: string; guidance: string; regs: string[] };
type SeedSubArea = { name: string; description: string; checks: SeedCheck[] };
type SeedArea = { code: string; name: string; description: string; subAreas: SeedSubArea[] };

// Regulations themselves come from data/regulations.json. The `regs` ids on each
// check are linked only when that id exists in the file.

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
        ck("Does the PSMF contain every section required?", "Map each section to the regulatory list.", ["gvp-ii", "eu-520-2012"]),
        ck("Are annex lists current?", "Compare against live system records.", ["gvp-ii"]),
      ]),
      sa("Maintenance", "Change control and availability.", [
        ck("Is there a logbook of PSMF changes?", "Check dates against known system changes.", ["gvp-ii"]),
        ck("Can the PSMF be provided on request in time?", "Run a retrieval drill.", ["gvp-ii", "eu-520-2012"]),
      ]),
    ],
  },
  {
    code: "QMS",
    name: "Quality Management System",
    description: "Procedures, document control, records and deviations.",
    subAreas: [
      sa("Procedures", "Coverage of PV processes by written procedures.", [
        ck("Is every PV process covered by a current procedure?", "Build a process-to-SOP matrix.", ["gvp-i", "eu-520-2012"]),
        ck("Are superseded procedures withdrawn?", "Sample procedures in use at sites.", ["gvp-i"]),
      ]),
      sa("Records", "Retention and retrievability.", [
        ck("Are PV records retained for the required period?", "Check the retention schedule.", ["eu-520-2012"]),
        ck("Can records be retrieved quickly?", "Pick five cases and time retrieval.", ["gvp-i"]),
      ]),
    ],
  },
  {
    code: "ICSR",
    name: "Individual Case Safety Reports",
    description: "Case intake, processing, follow-up and submission.",
    subAreas: [
      sa("Intake", "All sources reach the safety database.", [
        ck("Are all intake channels reconciled?", "Reconcile call centre, medical information and partners.", ["gvp-vi"]),
        ck("Is day zero recorded consistently?", "Sample cases from each channel.", ["gvp-vi", "cfr-314-80"]),
      ]),
      sa("Submission", "Timeliness and format.", [
        ck("Are expedited reports submitted on time?", "Review compliance metrics for the last year.", ["gvp-vi", "cfr-314-80"]),
        ck("Do transmissions follow E2B(R3)?", "Check acknowledgements and rejections.", ["ich-e2b-r3"]),
      ]),
    ],
  },
  {
    code: "SIG",
    name: "Signal Management",
    description: "Detection through to assessment and action.",
    subAreas: [
      sa("Detection", "Sources and frequency of review.", [
        ck("Is the detection frequency defined per product?", "Check the signal management plan.", ["gvp-ix"]),
        ck("Are all data sources covered?", "List sources and confirm each is screened.", ["gvp-ix"]),
      ]),
      sa("Assessment", "Validation, prioritisation and decisions.", [
        ck("Is every validated signal tracked to closure?", "Review the signal tracker.", ["gvp-ix"]),
        ck("Are decisions documented with rationale?", "Sample closed signals.", ["gvp-ix"]),
      ]),
    ],
  },
  {
    code: "PSUR",
    name: "Periodic Safety Update Reports",
    description: "PSUR/PBRER planning, authoring and submission.",
    subAreas: [
      sa("Planning", "Schedule and data lock points.", [
        ck("Is the PSUR schedule aligned to reference dates?", "Compare schedule to the reference list.", ["gvp-vii"]),
        ck("Are data lock points met?", "Review the last cycle.", ["gvp-vii"]),
      ]),
      sa("Content", "Structure and quality.", [
        ck("Does content follow the PBRER structure?", "Check a recent report.", ["ich-e2c-r2", "gvp-vii"]),
        ck("Are commitments from assessments tracked?", "Trace each commitment.", ["gvp-vii"]),
      ]),
    ],
  },
  {
    code: "RMP",
    name: "Risk Management Plans",
    description: "Safety specification and PV plan.",
    subAreas: [
      sa("Content", "Safety specification and plan.", [
        ck("Is each RMP current for its product?", "Compare version to latest approval.", ["gvp-v"]),
        ck("Do safety concerns match the latest data?", "Cross-check with signals and PSURs.", ["gvp-v", "ich-e2e"]),
      ]),
      sa("Commitments", "Additional PV activities.", [
        ck("Are study milestones tracked?", "Review milestone register.", ["gvp-v"]),
        ck("Are delays notified?", "Check correspondence for late milestones.", ["gvp-v"]),
      ]),
    ],
  },
  {
    code: "ARM",
    name: "Risk Minimisation Measures",
    description: "Additional measures and their effectiveness.",
    subAreas: [
      sa("Implementation", "Rollout in each market.", [
        ck("Is distribution of materials evidenced per market?", "Check distribution records.", ["gvp-xvi"]),
        ck("Are local versions approved?", "Compare to national approvals.", ["gvp-xvi"]),
      ]),
      sa("Effectiveness", "Measuring whether measures work.", [
        ck("Is effectiveness evaluated?", "Look for study or survey results.", ["gvp-xvi"]),
        ck("Do results feed back into the RMP?", "Trace outcomes to RMP updates.", ["gvp-xvi", "gvp-v"]),
      ]),
    ],
  },
  {
    code: "LIT",
    name: "Literature Monitoring",
    description: "Screening of published and local literature.",
    subAreas: [
      sa("Search", "Strategy and frequency.", [
        ck("Is the search strategy documented per substance?", "Review search strings.", ["gvp-vi"]),
        ck("Is screening at least weekly?", "Check run logs.", ["gvp-vi"]),
      ]),
      sa("Processing", "From article to case.", [
        ck("Are valid cases created from articles?", "Sample screened hits.", ["gvp-vi"]),
        ck("Is local literature covered?", "List local journals by market.", ["gvp-vi"]),
      ]),
    ],
  },
  {
    code: "QPPV",
    name: "QPPV and PV Organisation",
    description: "QPPV role, oversight and deputisation.",
    subAreas: [
      sa("Role", "Responsibilities and authority.", [
        ck("Is the QPPV's authority documented?", "Check job description and org chart.", ["gvp-i"]),
        ck("Is there a back-up arrangement?", "Check deputy procedure.", ["gvp-i"]),
      ]),
      sa("Oversight", "QPPV access to information.", [
        ck("Does the QPPV receive compliance metrics?", "Review recent oversight packs.", ["gvp-i"]),
        ck("Is the QPPV informed of emerging issues?", "Check escalation records.", ["gvp-i"]),
      ]),
    ],
  },
  {
    code: "TRN",
    name: "Training",
    description: "PV training for staff and partners.",
    subAreas: [
      sa("Curricula", "Role-based training.", [
        ck("Does each PV role have a curriculum?", "Map roles to curricula.", ["gvp-i"]),
        ck("Are non-PV staff trained on AE reporting?", "Check onboarding records.", ["gvp-i"]),
      ]),
      sa("Records", "Evidence of completion.", [
        ck("Is training completed before tasks begin?", "Compare training and system access dates.", ["gvp-i"]),
        ck("Are records retrievable for inspectors?", "Pull records for five staff.", ["gvp-i"]),
      ]),
    ],
  },
  {
    code: "PART",
    name: "Contracts and PV Agreements",
    description: "Safety data exchange with partners and vendors.",
    subAreas: [
      sa("Agreements", "Coverage and content.", [
        ck("Does every partner have a current agreement?", "Reconcile partner list to agreements.", ["gvp-ii", "gvp-i"]),
        ck("Are exchange timelines defined?", "Review sample agreements.", ["gvp-vi"]),
      ]),
      sa("Oversight", "Monitoring partner performance.", [
        ck("Is partner compliance reconciled?", "Check reconciliation records.", ["gvp-i"]),
        ck("Are partners audited on a risk basis?", "Compare audit plan to partner risk.", ["gvp-iv"]),
      ]),
    ],
  },
  {
    code: "AUD",
    name: "Audits and CAPA",
    description: "Audit programme, findings and corrective actions.",
    subAreas: [
      sa("Programme", "Risk-based audit plan.", [
        ck("Is there a risk-based audit plan?", "Review the plan and its rationale.", ["gvp-iv"]),
        ck("Are audit reports issued on time?", "Check report dates.", ["gvp-iv"]),
      ]),
      sa("CAPA", "Corrective and preventive action.", [
        ck("Are CAPAs closed on time?", "Review CAPA ageing.", ["gvp-iv", "gvp-i"]),
        ck("Is effectiveness of CAPA verified?", "Sample closed CAPAs.", ["gvp-iv"]),
      ]),
    ],
  },
];
