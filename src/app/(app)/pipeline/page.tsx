import type { Metadata } from "next";
import Link from "next/link";
import { pad2, SectionLabel } from "@/components/ui";
import { getPipelineStats } from "@/lib/queries";

export const metadata: Metadata = { title: "Pipeline" };

type State = "live" | "partial" | "planned";

const STATE_LABEL: Record<State, string> = { live: "Live", partial: "Partly built", planned: "Not started" };
const STATE_TONE: Record<State, string> = {
  live: "border-ink text-ink",
  partial: "border-ink text-muted",
  planned: "border-rule text-faint",
};

type Step = { title: string; does: string; phase: string; state: State; now?: string; href?: string };

export default async function PipelinePage() {
  const s = await getPipelineStats();
  const libraryDone = s.checks.total > 0 && s.checks.approved === s.checks.total;

  // The twelve steps of the build specification, section 4, in order.
  const steps: Step[] = [
    {
      title: "Inspection findings",
      does: "Fetch public findings from MHRA, EMA, Health Canada and FDA, plus user-uploaded 483s.",
      phase: "Phase 3",
      state: "planned",
    },
    {
      title: "Regulatory sources",
      does: "Regulations from 13 jurisdictions, each with source, section and as-of date.",
      phase: "Phase 1",
      state: "partial",
      now: `${s.regs.total} curated entries in ${s.regs.jurisdictions} groups. Automated fetch and clause-level text come with the change pathway.`,
      href: "/regulations",
    },
    {
      title: "Extract findings",
      does: "One record per observation, plus year-over-year trend records.",
      phase: "Phase 3",
      state: "planned",
    },
    {
      title: "Detect changes",
      does: "Clause-level diff on re-fetch; classify as impact, horizon or effective-date.",
      phase: "Phase 4",
      state: "planned",
    },
    {
      title: "Draft mapping (LLM)",
      does: "Propose links from each item to existing checks, quoting the source verbatim.",
      phase: "Phase 3",
      state: "partial",
      now: `The check library itself is LLM-drafted: ${s.checks.total + s.checks.retired} checks. Mapping findings to checks follows.`,
      href: "/areas",
    },
    {
      title: "Human approval",
      does: "A named person approves, edits or rejects. One approver; two for impact alerts.",
      phase: "Phase 2",
      state: "live",
      now: `Check library: ${s.checks.approved} of ${s.checks.total} approved, ${s.reviews.total} decisions recorded by ${s.people.total} named ${s.people.total === 1 ? "user" : "users"}.`,
      href: "/review",
    },
    {
      title: "Reference model",
      does: "Areas, sub-areas, checks and crosswalks; accumulates approved links.",
      phase: "Phase 1–2",
      state: libraryDone ? "live" : "partial",
      now: `${s.model.areas} frozen areas, ${s.model.subAreas} sub-areas, ${s.checks.total} active checks, ${s.xw.total} crosswalks (${s.xw.linked} linked to ${s.xw.regulationsCited} corpus entries).`,
      href: "/areas",
    },
    {
      title: "Company profile",
      does: "Markets, products, vendors, partners, roles, performer per area, SOP overlay.",
      phase: "Phase 5",
      state: "planned",
    },
    {
      title: "Score and route",
      does: "Applicability filter, visible score, silent baseline before the go-live date.",
      phase: "Phase 6",
      state: "planned",
    },
    {
      title: "Push alerts",
      does: "Immediate email for impact alerts; weekly digest for the rest; in-app for all.",
      phase: "Phase 6",
      state: "planned",
    },
    {
      title: "Readiness review",
      does: "Status, owner and evidence reference per check.",
      phase: "Phase 5",
      state: "planned",
    },
    {
      title: "Needs re-review",
      does: "A new approved item flips only the checks it touches.",
      phase: "Phase 5",
      state: "planned",
    },
  ];

  const phases = [
    { n: 1, title: "Foundation", body: "Real database, the 12 frozen areas, first load of regulations, named sign-in.", state: "live" as State },
    {
      n: 2,
      title: "Check library",
      body: `About 150–200 checks drafted with AI help and approved area by area. Now: ${s.checks.approved}/${s.checks.total} approved.`,
      state: (libraryDone ? "live" : "partial") as State,
    },
    { n: 3, title: "Findings", body: "FDA letters, MHRA and EMA reports, Health Canada entries, each mapped to checks and approved.", state: "planned" as State },
    { n: 4, title: "Regulation changes", body: "Federal Register feed first, then EU and UK; real before-and-after wording.", state: "planned" as State },
    { n: 5, title: "Company set-up and readiness", body: "Questionnaire, SOP overlay, status per check.", state: "planned" as State },
    { n: 6, title: "Scores and alerts", body: "Visible score factors, immediate email, weekly digest, in-app notices.", state: "planned" as State },
    { n: 7, title: "Backtest", body: "Run against a real past inspection or audit before anyone relies on it.", state: "planned" as State },
  ];

  return (
    <section>
      <SectionLabel n={1}>Pipeline</SectionLabel>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        Two inputs, inspection findings and regulatory changes, converge on one AI drafting step and
        one human approval, are pinned to a shared library of checks, and reach each company only where
        they apply. This page shows every stage and what is running today.
      </p>

      <ol className="mb-14">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[3rem_1fr_auto] gap-x-4 border-b border-rule py-4 last:border-b-0">
            <span className="pt-0.5 font-mono text-sm text-muted">{pad2(i + 1)}</span>
            <div className="min-w-0">
              {step.href ? (
                <Link href={step.href} className="font-medium underline-offset-4 hover:underline">
                  {step.title}
                </Link>
              ) : (
                <span className={`font-medium ${step.state === "planned" ? "text-muted" : ""}`}>{step.title}</span>
              )}
              <p className="mt-1 text-sm text-muted">{step.does}</p>
              {step.now && <p className="mt-2 border-l border-ink pl-3 text-sm">{step.now}</p>}
            </div>
            <div className="space-y-1 text-right">
              <span className={`label inline-block whitespace-nowrap border px-1.5 py-0.5 ${STATE_TONE[step.state]}`}>
                {STATE_LABEL[step.state]}
              </span>
              <div className="font-mono text-xs text-faint">{step.phase}</div>
            </div>
          </li>
        ))}
      </ol>

      <SectionLabel n={2}>Delivery phases</SectionLabel>
      <ol>
        {phases.map((p) => (
          <li key={p.n} className="grid grid-cols-[3rem_1fr_auto] gap-x-4 border-b border-rule py-3 last:border-b-0">
            <span className="pt-0.5 font-mono text-sm text-muted">{pad2(p.n)}</span>
            <div>
              <span className={`font-medium ${p.state === "planned" ? "text-muted" : ""}`}>{p.title}</span>
              <p className="mt-1 text-sm text-muted">{p.body}</p>
            </div>
            <span className={`label inline-block self-start whitespace-nowrap border px-1.5 py-0.5 ${STATE_TONE[p.state]}`}>
              {STATE_LABEL[p.state]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
