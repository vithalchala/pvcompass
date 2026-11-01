import type { Metadata } from "next";
import Link from "next/link";
import { Code, NumberedItem, SectionLabel } from "@/components/ui";
import { listJurisdictions, searchRegulations } from "@/lib/queries";

export const metadata: Metadata = { title: "Regulations" };

type Props = { searchParams: Promise<{ q?: string; j?: string }> };

export default async function RegulationsPage({ searchParams }: Props) {
  const { q = "", j = "" } = await searchParams;
  const [rows, jurisdictions] = await Promise.all([searchRegulations(q, j), listJurisdictions()]);
  const filtered = Boolean(q.trim() || j);

  return (
    <section>
      <SectionLabel n={2}>Regulations</SectionLabel>
      <form className="mb-6 flex flex-wrap gap-2" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label="Search regulations"
          placeholder="Search title, summary, section, tags…"
          className="block min-w-0 flex-1 basis-64 border border-rule px-3 py-2 text-sm outline-none focus:border-ink"
        />
        <select
          name="j"
          defaultValue={j}
          aria-label="Jurisdiction"
          className="border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="">All jurisdictions</option>
          {jurisdictions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <button type="submit" className="label border border-ink px-4 py-2 hover:bg-ink hover:text-paper">
          Search
        </button>
        {filtered && (
          <Link href="/regulations" className="label self-center px-2 text-muted hover:text-ink">
            Clear
          </Link>
        )}
      </form>

      <p className="label mb-2 text-muted">
        {rows.length} {rows.length === 1 ? "entry" : "entries"}
        {q.trim() && <> matching “{q.trim()}”</>}
        {j && <> in {j}</>}
      </p>
      <ol>
        {rows.map((r, i) => (
          <NumberedItem
            key={r.id}
            n={i + 1}
            href={`/regulations/${encodeURIComponent(r.id)}`}
            title={r.title}
            description={
              <span className="block truncate" title={r.summary}>
                {r.summary}
              </span>
            }
            aside={
              <div className="space-y-1 whitespace-nowrap">
                <div><Code>{r.jurisdiction}</Code></div>
                <div className="font-mono text-xs text-muted">as of {r.asOf}</div>
              </div>
            }
          />
        ))}
      </ol>
      {rows.length === 0 && (
        <p className="text-sm text-muted">
          {filtered ? "No entries match." : "No regulations loaded. Run npm run db:load-regulations."}
        </p>
      )}
    </section>
  );
}
