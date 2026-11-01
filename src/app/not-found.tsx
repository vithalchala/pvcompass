import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-24">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Not in the library.</h1>
      <Link href="/areas" className="label mt-6 inline-block text-muted hover:text-ink">← Areas</Link>
    </main>
  );
}
