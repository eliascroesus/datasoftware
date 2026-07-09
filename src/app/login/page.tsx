import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, authEnabled } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  // If login is disabled, there's nothing to log into.
  if (!authEnabled()) redirect("/");

  const token = cookies().get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) redirect(searchParams.next || "/");

  return <LoginForm next={searchParams.next || "/"} />;
}
