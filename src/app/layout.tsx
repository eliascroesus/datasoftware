import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "Unived — Unified Data Tracking",
  description:
    "Connect Close CRM, Calendly, SendBlue, Instantly, Google Sheets and webhooks into one live dashboard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <div className="lg:pl-64">
          <MobileNav />
          <main className="mx-auto min-h-screen w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
