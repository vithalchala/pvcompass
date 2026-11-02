import type { Metadata } from "next";
import { Code, NumberedItem, SectionLabel } from "@/components/ui";
import { listAreas } from "@/lib/queries";

export const metadata: Metadata = { title: "Check library" };

export default async function AreasPage() {
  const rows = await listAreas();
  const total = rows.reduce((n, a) => n + a.total, 0);
  const approved = rows.reduce((n, a) => n + a.approved, 0);
  return (
    <section>
      <SectionLabel n={2}>Check library</SectionLabel>
      <p className="mb-2 max-w-2xl text-sm text-muted">
        The reference model: twelve frozen PV system areas, their sub-areas and the verifiable checks
        every finding and regulatory change is mapped to. Company-neutral; each company&apos;s baseline
        is laid on top of it later.
      </p>
      <p className="label mb-6 text-muted">
        {approved} of {total} checks approved
      </p>
      <ol>
        {rows.map((a) => (
          <NumberedItem
            key={a.code}
            n={a.number}
            href={`/areas/${a.code}`}
            title={a.name}
            description={a.description}
            aside={
              <div className="space-y-1 whitespace-nowrap">
                <div><Code>{a.code}</Code></div>
                <div className="font-mono text-xs text-muted">{a.subAreas} sub-areas</div>
                <div className="font-mono text-xs text-muted">
                  {a.approved}/{a.total} approved
                </div>
              </div>
            }
          />
        ))}
      </ol>
      {rows.length === 0 && <p className="text-sm text-muted">No areas yet. Run npm run db:seed.</p>}
    </section>
  );
}
