import Link from "next/link";
import { Layers } from "lucide-react";
import { Footer } from "./Footer";

// Clean, centered layout for public legal pages (privacy / terms).
export function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-panel-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <Layers size={17} className="text-black" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white">
              NamziLabs
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-faint">Last updated: {updated}</p>
        <div className="mt-8">{children}</div>
      </main>

      <div className="border-t border-panel-border py-6">
        <Footer />
      </div>
    </div>
  );
}

// Styled primitives so the legal copy stays consistent and readable.
export function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-9 text-lg font-semibold text-white first:mt-0">{children}</h2>
  );
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-muted">{children}</p>;
}
export function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted">
      {children}
    </ul>
  );
}
