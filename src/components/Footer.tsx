import Link from "next/link";

// Small footer with legal links, used across the app and auth pages.
export function Footer({ className = "" }: { className?: string }) {
  const year = new Date().getFullYear();
  return (
    <footer
      className={
        "flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-faint " +
        className
      }
    >
      <span>© {year} NamziLabs</span>
      <span className="text-white/10">·</span>
      <Link href="/privacy" className="transition-colors hover:text-muted">
        Privacy
      </Link>
      <span className="text-white/10">·</span>
      <Link href="/terms" className="transition-colors hover:text-muted">
        Terms
      </Link>
    </footer>
  );
}
