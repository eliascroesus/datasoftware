"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isDbError =
    /database|connect|ECONNREFUSED|prisma|DATABASE_URL/i.test(error.message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="panel max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl2 bg-bad/15 text-bad">
          <AlertTriangle />
        </div>
        <h1 className="text-lg font-semibold text-white">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted">
          {isDbError
            ? "Couldn't reach the database. Check that DATABASE_URL is set correctly and the database is running."
            : "An unexpected error occurred while loading this page."}
        </p>
        <button onClick={reset} className="btn-primary mx-auto mt-5">
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    </div>
  );
}
