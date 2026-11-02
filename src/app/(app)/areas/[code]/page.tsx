import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckFacts, Code, pad2, SectionLabel, StatusTag } from "@/components/ui";
import { getArea, getAreaTree } from "@/lib/queries";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const area = await getArea((await params).code);
  return { title: area?.name ?? "Area" };
}

export default async function AreaPage({ params }: Props) {
  const area = await getArea((await params).code);
  if (!area) notFound();
  const subs = await getAreaTree(area.code);

  return (
    <article>
      <Link href="/areas" className="label text-muted hover:text-ink">← Check library</Link>
      <div className="mt-4 mb-10">
        <div className="font-mono text-sm text-muted">
          {pad2(area.number)} · {area.code}
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{area.name}</h2>
        <p className="mt-2 max-w-2xl text-muted">{area.description}</p>
      </div>

      {subs.map((sub) => (
        <section key={sub.code} className="mb-10">
          <SectionLabel n={sub.number}>
            {sub.name} <span className="text-faint">· {sub.code}</span>
          </SectionLabel>
          <p className="-mt-2 mb-2 text-sm text-muted">{sub.description}</p>
          {sub.checks.length === 0 && <p className="py-3 text-sm text-faint">No checks drafted yet.</p>}
          <ol>
            {sub.checks.map((c) => (
              <li key={c.checkId} className="grid grid-cols-[5rem_1fr_auto] gap-x-4 border-b border-rule py-4 last:border-b-0">
                <Link href={`/checks/${c.checkId}`} className="pt-0.5 hover:underline">
                  <Code>{c.checkId}</Code>
                </Link>
                <div className="min-w-0">
                  <span className="font-medium">{c.statement}</span>
                  <CheckFacts applicability={c.applicability} inspectorEvidence={c.inspectorEvidence} crosswalks={c.crosswalks} />
                </div>
                <div className="space-y-1 text-right">
                  <StatusTag status={c.status} />
                  <div className="font-mono text-xs text-faint">v{c.version}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}

      <Link href={`/review?area=${area.code}`} className="label border border-ink px-3 py-2 hover:bg-ink hover:text-paper">
        Review this area
      </Link>
    </article>
  );
}
