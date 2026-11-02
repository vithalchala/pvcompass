import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Code, NumberedItem, pad2, SectionLabel } from "@/components/ui";
import { getRegulation } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const reg = await getRegulation(decode((await params).id));
  return { title: reg?.title ?? "Regulation" };
}

export default async function RegulationPage({ params }: Props) {
  const reg = await getRegulation(decode((await params).id));
  if (!reg) notFound();

  return (
    <article>
      <Link href="/regulations" className="label text-muted hover:text-ink">← Regulations</Link>
      <div className="mt-4 mb-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Code>{reg.section ?? reg.jurisdiction}</Code>
          <span className="font-mono text-xs text-muted">as of {reg.asOf}</span>
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{reg.title}</h2>
      </div>

      <section className="mb-10">
        <SectionLabel n={1}>Summary</SectionLabel>
        <p className="max-w-2xl whitespace-pre-line leading-relaxed">{reg.summary}</p>
      </section>

      <section className="mb-10">
        <SectionLabel n={2}>Source</SectionLabel>
        <dl className="grid max-w-xl grid-cols-[8rem_1fr] gap-y-2 text-sm">
          <dt className="label pt-0.5 text-muted">Source</dt>
          <dd>{reg.sourceLabel ?? <span className="text-muted">—</span>}</dd>
          <dt className="label pt-0.5 text-muted">Section</dt>
          <dd>{reg.section ?? <span className="text-muted">—</span>}</dd>
          <dt className="label pt-0.5 text-muted">Jurisdiction</dt>
          <dd>{reg.jurisdiction}</dd>
          <dt className="label pt-0.5 text-muted">As of</dt>
          <dd><Code>{reg.asOf}</Code></dd>
          <dt className="label pt-0.5 text-muted">Tags</dt>
          <dd className="flex flex-wrap gap-1.5">
            {reg.tags.length === 0 && <span className="text-muted">—</span>}
            {reg.tags.map((t) => (
              <Link
                key={t}
                href={`/regulations?q=${encodeURIComponent(t)}`}
                className="border border-rule px-1.5 py-0.5 font-mono text-xs text-muted hover:border-ink hover:text-ink"
              >
                {t}
              </Link>
            ))}
          </dd>
        </dl>
      </section>

      <section>
        <SectionLabel n={3}>Checks citing this entry</SectionLabel>
        {reg.linked.length === 0 ? (
          <p className="text-sm text-muted">No checks cite this entry yet.</p>
        ) : (
          <ol>
            {reg.linked.map((c) => (
              <NumberedItem
                key={c.checkId}
                n={`${pad2(c.subNumber)}.${pad2(c.checkNumber)}`}
                href={`/areas/${c.areaCode}`}
                title={c.question}
                description={`${pad2(c.areaNumber)} ${c.areaName}`}
                aside={<Code>{c.areaCode}</Code>}
              />
            ))}
          </ol>
        )}
      </section>
    </article>
  );
}
