import type { Metadata } from "next";
import { AsOfLine, Caution, Masthead } from "@/components/ui";
import { getCorpusAsOf } from "@/lib/queries";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const asOf = await getCorpusAsOf();
  return (
    <>
      <AsOfLine asOf={asOf} />
      <Masthead />
      <main className="mx-auto max-w-5xl px-6">
        <div className="max-w-md border-t border-rule pt-6">
          <div className="mb-6 flex items-baseline gap-3">
            <span className="font-mono text-xs text-muted">§ 00</span>
            <h2 className="label">Sign in</h2>
          </div>
          <LoginForm />
          <div className="mt-10">
            <Caution />
          </div>
        </div>
      </main>
    </>
  );
}
