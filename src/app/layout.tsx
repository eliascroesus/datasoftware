import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NamziLabs — Unified Data Tracking",
  description:
    "Connect Close CRM, Calendly, SendBlue, Instantly, Google Sheets and webhooks into one live dashboard.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
