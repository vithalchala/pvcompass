import type { Metadata } from "next";
import { ROLES } from "@/db/schema";
import { Code, SectionLabel } from "@/components/ui";
import { listUsers } from "@/lib/queries";
import { requireRole } from "@/lib/session";
import { saveUser } from "./actions";

export const metadata: Metadata = { title: "Users" };

const ROLE_HELP: Record<(typeof ROLES)[number], string> = {
  viewer: "Read everything",
  check_owner: "Owns checks in the readiness review (later phase)",
  mapping_approver: "Approves finding and change mappings (later phase)",
  library_owner: "Approves, edits and retires checks in the library",
  company_admin: "Adds users and assigns roles",
};

const input = "mt-1 block w-full border border-rule bg-paper px-3 py-2 text-sm outline-none focus:border-ink";

type Props = { searchParams: Promise<{ error?: string; saved?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  await requireRole("company_admin");
  const { error, saved } = await searchParams;
  const rows = await listUsers();

  return (
    <section>
      <SectionLabel n={5}>Users and roles</SectionLabel>
      <p className="mb-6 max-w-2xl text-sm text-muted">
        Everyone signs in as a named person, so every approval records who made it. Saving an existing
        email updates that person&apos;s name, roles and password.
      </p>
      {error && <p role="alert" className="mb-4 border border-alert px-3 py-2 text-sm text-alert">{error}</p>}
      {saved && <p className="mb-4 border border-ink px-3 py-2 text-sm">Saved {saved}.</p>}

      <ol className="mb-12">
        {rows.map((u) => (
          <li key={u.id} className="grid grid-cols-[1fr_auto] gap-x-4 border-b border-rule py-3 last:border-b-0">
            <div>
              <span className="font-medium">{u.name}</span> <span className="text-sm text-muted">{u.email}</span>
            </div>
            <div className="flex flex-wrap justify-end gap-x-2">
              {u.roles.map((r) => (
                <Code key={r}>{r}</Code>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <SectionLabel n={6}>Add or update a user</SectionLabel>
      <form action={saveUser} className="grid max-w-xl gap-4">
        <label>
          <span className="label text-muted">Full name</span>
          <input name="name" required className={input} />
        </label>
        <label>
          <span className="label text-muted">Email</span>
          <input name="email" type="email" required className={input} />
        </label>
        <label>
          <span className="label text-muted">Password (12+ characters)</span>
          <input name="password" type="password" required minLength={12} autoComplete="new-password" className={input} />
        </label>
        <fieldset>
          <legend className="label text-muted">Roles</legend>
          {ROLES.map((r) => (
            <label key={r} className="mt-2 flex items-baseline gap-2 text-sm">
              <input type="checkbox" name="roles" value={r} />
              <Code>{r}</Code> <span className="text-muted">{ROLE_HELP[r]}</span>
            </label>
          ))}
        </fieldset>
        <div>
          <button className="label border border-ink px-4 py-2 hover:bg-ink hover:text-paper">Save user</button>
        </div>
      </form>
    </section>
  );
}
