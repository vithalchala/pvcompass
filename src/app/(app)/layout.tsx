import Link from "next/link";
import { AsOfLine, Caution, Masthead } from "@/components/ui";
import { getCorpusAsOf } from "@/lib/queries";
import { hasRole, requireUser } from "@/lib/session";
import { logout } from "../login/actions";

const NAV = [
  { href: "/pipeline", label: "Pipeline" },
  { href: "/areas", label: "Check library" },
  { href: "/review", label: "Review" },
  { href: "/regulations", label: "Regulations" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const asOf = await getCorpusAsOf();
  const nav = hasRole(user, "company_admin") ? [...NAV, { href: "/users", label: "Users" }] : NAV;
  return (
    <>
      <AsOfLine asOf={asOf} />
      <Masthead />
      <nav className="border-y border-rule">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2.5">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="label text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
          <span className="ml-auto font-mono text-xs text-muted">{user.name}</span>
          <form action={logout}>
            <button type="submit" className="label text-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <div className="mx-auto max-w-5xl px-6 pt-6">
        <Caution />
      </div>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </>
  );
}
