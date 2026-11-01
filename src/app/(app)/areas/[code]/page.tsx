import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Code, NumberedItem, pad2, SectionLabel, StatusTag } from "@/components/ui";
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
      <Link href="/areas" className="label text-muted hover:text-ink">← Areas</Link>
      <div className="mt-4 mb-10">
        <div className="font-mono text-sm text-muted">
          {pad2(area.number)} · {area.code}
        </div>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">{area.name}</h2>
        <p className="mt-2 max-w-2xl text-muted">{area.description}</p>
      </div>

      {subs.map((sub) => (
        <section key={sub.id} className="mb-10">
          <SectionLabel n={sub.number}>{sub.name}</SectionLabel>
          <p className="-mt-2 mb-2 text-sm text-muted">{sub.description}</p>
          <ol>
            {sub.checks.map((c) => (
              <NumberedItem
                key={c.id}
                n={`${pad2(sub.number)}.${pad2(c.number)}`}
                title={c.question}
                description={c.guidance}
                aside={<StatusTag status={c.status} />}
              >
                {c.regs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {c.regs.map((r) => (
                      <Link key={r.id} href={`/regulations/${encodeURIComponent(r.id)}`} className="text-muted hover:text-ink">
                        <Code>{r.label}</Code>
                      </Link>
                    ))}
                  </div>
                )}
              </NumberedItem>
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
