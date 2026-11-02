import Link from "next/link";

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Thin line at the very top of every page with the corpus snapshot date. */
export function AsOfLine({ asOf }: { asOf: string | null }) {
  return (
    <div className="border-b border-rule">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-2 text-muted label">
        <span>Preparation library</span>
        <span>
          Corpus as of <span className="text-ink">{asOf ?? "—"}</span>
        </span>
      </div>
    </div>
  );
}

export function Masthead() {
  return (
    <header className="mx-auto max-w-5xl px-6 pt-10 pb-6">
      <Link href="/pipeline" className="inline-block">
        <h1 className="text-3xl font-semibold tracking-tight">PV Compass</h1>
      </Link>
      <p className="mt-1 text-[15px] text-muted">Inspection readiness for a PV system</p>
    </header>
  );
}

export function Caution() {
  return (
    <div className="border border-rule px-4 py-3 text-sm">
      <span className="label mr-3 text-ink">Caution</span>
      <span className="text-muted">
        Preparation tool. Not a system of record. Not validated. No e-signatures.
      </span>
    </div>
  );
}

/** "§ 01  Title" section heading. */
export function SectionLabel({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline gap-3 border-b border-rule pb-2">
      <span className="font-mono text-xs text-muted">§ {pad2(n)}</span>
      <h2 className="label text-ink">{children}</h2>
    </div>
  );
}

/** Numbered row: mono number, title, short muted description underneath. */
export function NumberedItem({
  n,
  title,
  description,
  href,
  aside,
  children,
}: {
  n: number | string;
  title: React.ReactNode;
  description?: React.ReactNode;
  href?: string;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const heading = href ? (
    <Link href={href} className="font-medium underline-offset-4 hover:underline">
      {title}
    </Link>
  ) : (
    <span className="font-medium">{title}</span>
  );
  return (
    <li className="grid grid-cols-[3rem_1fr_auto] gap-x-4 border-b border-rule py-4 last:border-b-0">
      <span className="pt-0.5 font-mono text-sm text-muted">
        {typeof n === "number" ? pad2(n) : n}
      </span>
      <div className="min-w-0">
        <div>{heading}</div>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        {children}
      </div>
      <div className="text-right">{aside}</div>
    </li>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[13px]">{children}</span>;
}

export type CheckStatus = "draft" | "approved" | "retired";

export function StatusTag({ status }: { status: CheckStatus }) {
  const tone =
    status === "approved" ? "text-ink border-ink" : status === "retired" ? "text-faint border-rule line-through" : "text-muted border-rule";
  return <span className={`label inline-block border px-1.5 py-0.5 ${tone}`}>{status}</span>;
}

const REQUIRE_LABELS: Record<string, string> = {
  sdea_partners: "has SDEA partners",
  vendor_performed: "an area is vendor-performed",
  rems: "holds a REMS",
  armm: "has additional risk minimisation",
  eu_qppv: "has an EU QPPV",
  uk_qppv: "has a UK QPPV",
  psmf: "holds a PSMF",
  active_trials: "runs clinical trials",
  local_pv_contacts: "has local PV contacts",
  patient_programmes: "runs patient programmes",
};

type Applicability = { markets?: string[]; product_types?: string[]; requires?: string[] } | null;

/** Plain-language form of a check's applicability predicates. */
export function applicabilityText(a: Applicability): string {
  if (!a) return "Any company";
  const parts: string[] = [];
  if (a.markets?.length) parts.push(`market in ${a.markets.join(", ")}`);
  if (a.product_types?.length) parts.push(`product type ${a.product_types.join(" or ")}`);
  for (const r of a.requires ?? []) parts.push(REQUIRE_LABELS[r] ?? r);
  return parts.length ? parts.join(" · ") : "Any company";
}

/** Check facts shown in the library and review screens. */
export function CheckFacts({
  applicability,
  inspectorEvidence,
  crosswalks,
}: {
  applicability: Applicability;
  inspectorEvidence: string[];
  crosswalks: { citation: string; jurisdiction: string; regulationId: string | null }[];
}) {
  return (
    <dl className="mt-2 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="label pt-0.5 text-faint">Applies when</dt>
      <dd className="text-muted">{applicabilityText(applicability)}</dd>
      <dt className="label pt-0.5 text-faint">Evidence</dt>
      <dd className="text-muted">{inspectorEvidence.join("; ")}</dd>
      <dt className="label pt-0.5 text-faint">Crosswalks</dt>
      <dd className="flex flex-wrap gap-x-3 gap-y-1">
        {crosswalks.map((x) =>
          x.regulationId ? (
            <Link
              key={x.citation}
              href={`/regulations/${encodeURIComponent(x.regulationId)}`}
              className="text-muted underline-offset-4 hover:text-ink hover:underline"
            >
              <Code>{x.citation}</Code>
            </Link>
          ) : (
            <span key={x.citation} className="text-muted">
              <Code>{x.citation}</Code>
            </span>
          ),
        )}
      </dd>
    </dl>
  );
}

export const fmtTime = (d: Date) => `${d.toISOString().slice(0, 16).replace("T", " ")} UTC`;
