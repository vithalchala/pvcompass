import type { Metadata } from "next";
import { Code, NumberedItem, SectionLabel } from "@/components/ui";
import { listAreas } from "@/lib/queries";

export const metadata: Metadata = { title: "Areas" };

export default async function AreasPage() {
  const rows = await listAreas();
  return (
    <section>
      <SectionLabel n={1}>PV system areas</SectionLabel>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        The twelve areas an inspector is likely to examine. Each holds sub-areas and the checks to
        prepare before an inspection.
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
              <div className="space-y-1">
                <div><Code>{a.code}</Code></div>
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
