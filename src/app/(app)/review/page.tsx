import type { Metadata } from "next";
import Link from "next/link";
import { CheckFacts, Code, fmtTime, pad2, SectionLabel, StatusTag } from "@/components/ui";
import { getAreaTree, listAreas, type TreeCheck } from "@/lib/queries";
import { hasRole, requireUser } from "@/lib/session";
import { reviewCheck } from "./actions";

export const metadata: Metadata = { title: "Review" };

type Props = { searchParams: Promise<{ area?: string; error?: string; show?: string }> };

const input = "min-w-0 border border-rule bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink";
const primary = "label border border-ink px-3 py-1.5 hover:bg-ink hover:text-paper";
const secondary = "label border border-rule px-3 py-1.5 text-muted hover:border-ink hover:text-ink";

function ReviewForm({ c, area }: { c: TreeCheck; area: string }) {
  return (
    <div className="mt-3 space-y-2">
      <form action={reviewCheck} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="checkId" value={c.checkId} />
        <input type="hidden" name="version" value={c.version} />
        <input type="hidden" name="area" value={area} />
        <input name="comment" placeholder="Comment (required to reject or retire)" aria-label={`Comment on ${c.checkId}`} className={`${input} flex-1 basis-64`} />
        {c.status === "draft" && (
          <button name="decision" value="approve" className={primary}>
            Approve
          </button>
        )}
        {c.status !== "retired" && (
          <button name="decision" value="reject" className="label border border-rule px-3 py-1.5 text-alert hover:border-alert">
            Reject
          </button>
        )}
        {c.status !== "retired" ? (
          <button name="decision" value="retire" className={secondary}>
            Retire
          </button>
        ) : (
          <button name="decision" value="reopen" className={secondary}>
            Reopen
          </button>
        )}
      </form>
      {c.status !== "retired" && (
        <details>
          <summary className="label cursor-pointer text-muted hover:text-ink">Edit wording (creates v{c.version + 1})</summary>
          <form action={reviewCheck} className="mt-2 space-y-2">
            <input type="hidden" name="checkId" value={c.checkId} />
            <input type="hidden" name="version" value={c.version} />
            <input type="hidden" name="area" value={area} />
            <input type="hidden" name="decision" value="edit" />
            <label className="block">
              <span className="label text-faint">Statement</span>
              <textarea name="statement" defaultValue={c.statement} rows={2} required className={`${input} mt-1 block w-full`} />
            </label>
            <label className="block">
              <span className="label text-faint">Inspector evidence, one per line</span>
              <textarea name="evidence" defaultValue={c.inspectorEvidence.join("\n")} rows={3} required className={`${input} mt-1 block w-full font-mono`} />
            </label>
            <input name="comment" placeholder="Why the change (optional)" className={`${input} block w-full`} />
            <button className={primary}>Save new version</button>
          </form>
        </details>
      )}
    </div>
  );
}

export default async function ReviewPage({ searchParams }: Props) {
  const user = await requireUser();
  const canReview = hasRole(user, "library_owner");
  const { area: requested, error, show } = await searchParams;
  const areaRows = await listAreas();
  const current = areaRows.find((a) => a.code === requested?.toUpperCase()) ?? areaRows.find((a) => a.draft > 0) ?? areaRows[0];
  const showAll = show === "all";
  const subs = current ? await getAreaTree(current.code, { includeRetired: showAll }) : [];

  return (
    <section>
      <SectionLabel n={3}>Check library review</SectionLabel>
      <p className="mb-2 max-w-2xl text-sm text-muted">
        Approve the library area by area. Every check is an LLM draft until a named check-library owner
        approves it; only approved checks can receive findings and regulatory changes. Editing the
        wording creates a new version and returns it to draft. Decisions record who and when; they
        are not electronic signatures.
      </p>
      {!canReview && (
        <p className="mb-4 text-sm text-alert">You can view this screen. Approving needs the check-library owner role.</p>
      )}
      {error && (
        <p role="alert" className="mb-4 border border-alert px-3 py-2 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-10 md:grid-cols-[15rem_1fr]">
        <ol className="self-start border-t border-rule md:sticky md:top-4">
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
                  <span className={`font-mono text-xs ${a.approved === a.total && a.total > 0 ? "text-ink" : ""}`}>
                    {a.approved}/{a.total}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="min-w-0">
          {current && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
              <div>
                <div className="font-mono text-sm text-muted">
                  {pad2(current.number)} · {current.code}
                </div>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{current.name}</h3>
                <p className="label mt-1 text-muted">
                  {current.approved} approved · {current.draft} draft
                </p>
              </div>
              <Link href={`/review?area=${current.code}${showAll ? "" : "&show=all"}`} className="label text-muted hover:text-ink">
                {showAll ? "Hide retired" : "Show retired"}
              </Link>
            </div>
          )}
          {subs.map((sub) => (
            <div key={sub.code} className="mb-8">
              <div className="mb-2 flex items-baseline gap-3 border-b border-rule pb-2">
                <span className="font-mono text-xs text-muted">{sub.code}</span>
                <span className="label">{sub.name}</span>
              </div>
              <ol>
                {sub.checks.map((c) => (
                  <li id={c.checkId} key={c.checkId} className="scroll-mt-4 border-b border-rule py-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <Link href={`/checks/${c.checkId}`} className="hover:underline">
                          <Code>{c.checkId}</Code>
                        </Link>
                        <span className="ml-2 font-mono text-xs text-faint">v{c.version}</span>
                        <p className="mt-1 font-medium">{c.statement}</p>
                      </div>
                      <StatusTag status={c.status} />
                    </div>
                    <CheckFacts applicability={c.applicability} inspectorEvidence={c.inspectorEvidence} crosswalks={c.crosswalks} />
                    {c.status === "approved" && c.approvedAt && (
                      <p className="mt-2 font-mono text-xs text-faint">
                        Approved by {c.approvedByName} · {fmtTime(c.approvedAt)}
                      </p>
                    )}
                    {canReview && <ReviewForm c={c} area={current!.code} />}
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
