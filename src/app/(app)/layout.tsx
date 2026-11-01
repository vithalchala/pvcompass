import Link from "next/link";
import { AsOfLine, Caution, Masthead } from "@/components/ui";
import { getCorpusAsOf } from "@/lib/queries";
import { requireAdmin } from "@/lib/session";
import { logout } from "../login/actions";

const NAV = [
  { href: "/areas", label: "Areas" },
  { href: "/regulations", label: "Regulations" },
  { href: "/review", label: "Review" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const asOf = await getCorpusAsOf();
  return (
    <>
      <AsOfLine asOf={asOf} />
      <Masthead />
      <nav className="border-y border-rule">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-6 py-2.5">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="label text-muted hover:text-ink">
              {item.label}
            </Link>
          ))}
          <form action={logout} className="ml-auto">
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
