import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckFacts, Code, fmtTime, pad2, SectionLabel, StatusTag } from "@/components/ui";
import { getCheck } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).id.toUpperCase() };
}

const DECISION_LABEL = { approve: "Approved", reject: "Rejected", edit: "Edited", retire: "Retired", reopen: "Reopened" };

export default async function CheckPage({ params }: Props) {
  const check = await getCheck((await params).id);
  if (!check) notFound();

  return (
    <article>
      <Link href={`/areas/${check.areaCode}`} className="label text-muted hover:text-ink">
        ← {check.areaName}
      </Link>
      <div className="mt-4 mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="font-mono text-sm text-muted">
            {pad2(check.areaNumber)} · {check.subAreaCode} {check.subAreaName}
          </span>
          <span className="flex items-center gap-2">
            <span className="font-mono text-xs text-faint">v{check.version}</span>
            <StatusTag status={check.status} />
          </span>
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          <Code>{check.checkId}</Code>
        </h2>
        <p className="mt-3 max-w-2xl text-lg leading-relaxed">{check.statement}</p>
        <CheckFacts applicability={check.applicability} inspectorEvidence={check.inspectorEvidence} crosswalks={check.crosswalks} />
        <p className="mt-4 text-sm text-muted">
          {check.status === "approved" && check.approvedAt
            ? `Approved by ${check.approvedByName} on ${fmtTime(check.approvedAt)}.`
            : `Drafted by: ${check.draftedBy ?? "unknown"}. Not yet approved.`}{" "}
          <Link href={`/review?area=${check.areaCode}#${check.checkId}`} className="underline underline-offset-4 hover:text-ink">
            Review
          </Link>
        </p>
      </div>

      <section className="mb-10">
        <SectionLabel n={1}>Review history</SectionLabel>
        {check.reviews.length === 0 ? (
          <p className="text-sm text-muted">No review decisions yet.</p>
        ) : (
          <ol>
            {check.reviews.map((r) => (
              <li key={r.id} className="grid grid-cols-[10rem_1fr] gap-x-4 border-b border-rule py-3 text-sm last:border-b-0">
                <span className="font-mono text-xs text-muted">{fmtTime(r.decidedAt)}</span>
                <span>
                  <span className="font-medium">{DECISION_LABEL[r.decision]}</span> v{r.version} by {r.reviewer}
                  {r.comment && <span className="mt-1 block border-l border-rule pl-3 text-muted">{r.comment}</span>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <SectionLabel n={2}>Versions</SectionLabel>
        <ol>
          {check.versions.map((v) => (
            <li key={v.version} className="grid grid-cols-[3rem_1fr_auto] gap-x-4 border-b border-rule py-3 text-sm last:border-b-0">
              <span className="font-mono text-muted">v{v.version}</span>
              <span>{v.statement}</span>
              <span className="whitespace-nowrap font-mono text-xs text-faint">
                {v.source === "file" ? "library file" : v.source} · {fmtTime(v.createdAt).slice(0, 10)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
