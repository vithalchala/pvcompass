import type { Metadata } from "next";
import Link from "next/link";
import { pad2, SectionLabel, StatusTag } from "@/components/ui";
import { getAreaTree, listAreas } from "@/lib/queries";
import { setCheckStatus } from "./actions";

export const metadata: Metadata = { title: "Review" };

type Props = { searchParams: Promise<{ area?: string }> };

export default async function ReviewPage({ searchParams }: Props) {
  const requested = (await searchParams).area?.toUpperCase();
  const areaRows = await listAreas();
  const current = areaRows.find((a) => a.code === requested) ?? areaRows[0];
  const subs = current ? await getAreaTree(current.code) : [];

  return (
    <section>
      <SectionLabel n={3}>Check review</SectionLabel>
      <p className="mb-8 max-w-2xl text-sm text-muted">
        Go area by area. Mark each check approved or rejected with an optional note. This records
        preparation status only; it is not an electronic signature.
      </p>

      <div className="grid gap-10 md:grid-cols-[14rem_1fr]">
        <ol className="border-t border-rule">
          {areaRows.map((a) => {
            const active = a.code === current?.code;
            return (
              <li key={a.code} className="border-b border-rule">
                <Link
                  href={`/review?area=${a.code}`}
                  aria-current={active ? "page" : undefined}
                  className={`grid grid-cols-[2rem_1fr_auto] gap-2 py-2 text-sm ${active ? "text-ink" : "text-muted hover:text-ink"}`}
                >
                  <span className="font-mono">{pad2(a.number)}</span>
                  <span className={active ? "font-medium" : ""}>{a.name}</span>
                  <span className="font-mono text-xs">
                    {a.approved}/{a.total}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div>
          {current && (
            <div className="mb-6">
              <div className="font-mono text-sm text-muted">
                {pad2(current.number)} · {current.code}
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{current.name}</h3>
            </div>
          )}
          {subs.map((sub) => (
            <div key={sub.id} className="mb-8">
              <div className="mb-2 flex items-baseline gap-3 border-b border-rule pb-2">
                <span className="font-mono text-xs text-muted">§ {pad2(sub.number)}</span>
                <span className="label">{sub.name}</span>
              </div>
              <ol>
                {sub.checks.map((c) => (
                  <li key={c.id} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-rule py-4 last:border-b-0">
                    <span className="pt-0.5 font-mono text-sm text-muted">
                      {pad2(sub.number)}.{pad2(c.number)}
                    </span>
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <span className="font-medium">{c.question}</span>
                        <StatusTag status={c.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted">{c.guidance}</p>
                      {c.reviewNote && (
                        <p className="mt-2 border-l border-rule pl-3 text-sm">{c.reviewNote}</p>
                      )}
                      {c.reviewedAt && (
                        <p className="mt-1 font-mono text-xs text-faint">
                          Reviewed {c.reviewedAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                        </p>
                      )}
                      <form action={setCheckStatus} className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="checkId" value={c.id} />
                        <input
                          name="note"
                          placeholder="Note (optional)"
                          defaultValue={c.reviewNote ?? ""}
                          className="min-w-0 flex-1 border border-rule px-2 py-1.5 text-sm outline-none focus:border-ink"
                        />
                        <button name="status" value="approved" className="label border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper">
                          Approve
                        </button>
                        <button name="status" value="rejected" className="label border border-rule px-3 py-1.5 text-alert hover:border-alert">
                          Reject
                        </button>
                        {c.status !== "pending" && (
                          <button name="status" value="pending" className="label px-2 py-1.5 text-muted hover:text-ink">
                            Reset
                          </button>
                        )}
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
