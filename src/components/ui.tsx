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
      <Link href="/areas" className="inline-block">
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

export function StatusTag({ status }: { status: "pending" | "approved" | "rejected" }) {
  const tone =
    status === "approved" ? "text-ink border-ink" : status === "rejected" ? "text-alert border-alert" : "text-muted border-rule";
  return <span className={`label inline-block border px-1.5 py-0.5 ${tone}`}>{status}</span>;
}
