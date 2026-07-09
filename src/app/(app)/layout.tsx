import { cookies } from "next/headers";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { SetupBanner } from "@/components/SetupBanner";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = authEnabled();
  const token = cookies().get(SESSION_COOKIE)?.value;
  const signedIn = enabled && (await verifySession(token));

  return (
    <>
      <Sidebar showSignOut={signedIn} />
      <div className="lg:pl-64">
        <MobileNav />
        <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {!enabled ? <SetupBanner /> : null}
          {children}
        </main>
      </div>
    </>
  );
}
