import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl2 bg-brand/15 text-brand-soft">
          <Compass />
        </div>
        <h1 className="text-lg font-semibold text-white">Page not found</h1>
        <p className="mt-2 text-sm text-muted">
          That page doesn&apos;t exist or may have moved.
        </p>
        <Link href="/" className="btn-primary mx-auto mt-5">
          Back to home
        </Link>
      </div>
    </div>
  );
}
