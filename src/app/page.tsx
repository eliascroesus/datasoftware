import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Layers,
  Cable,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  Table2,
  LineChart,
  Lock,
  Webhook,
  Check,
} from "lucide-react";
import { ProviderBadge } from "@/components/ProviderIcon";
import { Sparkline } from "@/components/charts/Sparkline";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "NamziLabs — Unified Data Tracking Platform",
  description:
    "Connect Google Sheets, Close CRM, Calendly, Instantly, SendBlue and custom webhooks into one dashboard. Track booked calls, reply rates, close rates and campaign performance.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "NamziLabs — Unified Data Tracking Platform",
    description:
      "One dashboard for all your business tools. Connect data sources, choose what to track, and see your metrics in real time.",
    type: "website",
  },
};

const INTEGRATIONS = [
  { provider: "google_sheets", name: "Google Sheets", tag: "Track any column" },
  { provider: "close", name: "Close CRM", tag: "Leads & close rate" },
  { provider: "calendly", name: "Calendly", tag: "Booking rate" },
  { provider: "instantly", name: "Instantly", tag: "Campaign reply rate" },
  { provider: "sendblue", name: "SendBlue", tag: "SMS reply rate" },
  { provider: "webhook", name: "Webhooks", tag: "Connect anything" },
];

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-panel-border bg-bg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
            <Layers size={18} className="text-black" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white">
            NamziLabs
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <a href="#how" className="hover:text-white">
            How it works
          </a>
          <a href="#integrations" className="hover:text-white">
            Integrations
          </a>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
          <Link href="/login" className="btn-primary hidden sm:inline-flex">
            Get started <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroMock() {
  const cards = [
    { label: "Booked calls", value: "128", data: [4, 6, 5, 8, 7, 9, 11, 13], color: "teal" },
    { label: "Reply rate", value: "37%", data: [20, 24, 22, 28, 31, 30, 35, 37], color: "brand" },
    { label: "Close rate", value: "46.9%", data: [30, 34, 33, 40, 44, 42, 45, 47], color: "violet" },
    { label: "Emails sent", value: "20,105", data: [8, 9, 11, 12, 14, 16, 18, 20], color: "amber" },
  ];
  return (
    <div className="panel relative overflow-hidden p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Summary</div>
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-good" />
          <span className="text-[11px] text-faint">live</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border border-panel-border bg-black/20 p-3">
            <div className="text-[11px] text-muted">{c.label}</div>
            <div className="mt-1 flex items-end justify-between gap-2">
              <div className="text-xl font-semibold text-white">{c.value}</div>
              <Sparkline data={c.data} color={c.color} width={72} height={30} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-panel-border bg-black/20 p-3">
        <div className="flex -space-x-2">
          {["google_sheets", "close", "calendly", "instantly"].map((p) => (
            <div key={p} className="rounded-lg ring-2 ring-bg">
              <ProviderBadge provider={p} size={26} />
            </div>
          ))}
        </div>
        <span className="text-xs text-muted">4 sources syncing</span>
      </div>
    </div>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number;
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/12 text-brand-soft">
          <Icon size={18} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-faint">
          Step {n}
        </span>
      </div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel panel-hover p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.04] text-brand-soft">
        <Icon size={18} />
      </span>
      <h3 className="mt-3 font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{children}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <NavBar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="chip">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
              Unified data tracking
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl">
              All your business data in{" "}
              <span className="text-zinc-400">one dashboard</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              NamziLabs connects the tools you already use — Google Sheets, Close
              CRM, Calendly, Instantly, SendBlue and custom webhooks — into a
              single live dashboard. Choose exactly what to track and watch your
              metrics update automatically.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary px-5 py-2.5 text-base">
                Get started <ArrowRight size={17} />
              </Link>
              <a href="#how" className="btn-ghost px-5 py-2.5 text-base">
                See how it works
              </a>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-faint">
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-good" /> Read-only access
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-good" /> Encrypted credentials
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={13} className="text-good" /> Disconnect anytime
              </span>
            </div>
          </div>
          <div className="lg:pl-6">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section id="integrations" className="border-y border-panel-border/60 bg-white/[0.012] py-12">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-center text-sm font-medium text-muted">
            Connect the tools you already use
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {INTEGRATIONS.map((i) => (
              <div
                key={i.provider}
                className="panel flex flex-col items-center gap-2 p-4 text-center"
              >
                <ProviderBadge provider={i.provider} size={40} />
                <div className="text-sm font-medium text-white">{i.name}</div>
                <div className="text-[11px] text-faint">{i.tag}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What is NamziLabs (clear explanation for everyone, incl. reviewers) */}
      <section className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          What is NamziLabs?
        </h2>
        <p className="mt-5 text-base leading-relaxed text-muted">
          NamziLabs is a unified data-tracking platform for connecting business
          tools like Google Sheets, Close CRM, Calendly, Instantly, SendBlue, and
          custom webhooks into one dashboard. Users can connect selected data
          sources, configure which spreadsheets, tabs and columns to track, and
          view metrics such as booked calls, reply rates, close rates, campaign
          performance, and lead activity. Users can disconnect integrations at
          any time.
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-5 pb-16">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-muted">Three steps, no code.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Step n={1} icon={Cable} title="Connect a source">
            Sign in with Google or paste an API key. Your credentials are
            encrypted, and Google access is read-only.
          </Step>
          <Step n={2} icon={Table2} title="Choose what to track">
            Pick the exact spreadsheet, tab and columns — or campaigns, bookings
            and pipelines. Preview real sample data as you map it.
          </Step>
          <Step n={3} icon={LineChart} title="Track your metrics">
            Build metrics like booked calls, reply rate and close rate. They
            update automatically on a schedule and via webhooks.
          </Step>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={SlidersHorizontal} title="No-code metric builder">
            Count, sum, average or compute rates over any field — with filter
            rules on specific columns. Live preview before you save.
          </Feature>
          <Feature icon={Zap} title="Always up to date">
            Scheduled syncs keep your data fresh, and inbound webhooks stream
            events in real time.
          </Feature>
          <Feature icon={Table2} title="Column-level control">
            For spreadsheets, track exactly the columns you choose — e.g. how many
            rows are “Booked” vs “Not booked.”
          </Feature>
          <Feature icon={Webhook} title="Connect anything">
            A unique webhook URL per source catches data from Zapier, Make, Stripe
            or your own code.
          </Feature>
          <Feature icon={Lock} title="Private by default">
            The dashboard is protected behind login. Credentials and OAuth tokens
            are encrypted at rest with AES-256-GCM.
          </Feature>
          <Feature icon={LineChart} title="One clear picture">
            Every source, unified — with trends, an activity feed, and per-source
            drill-downs.
          </Feature>
        </div>
      </section>

      {/* Google data usage — explicit for users and reviewers */}
      <section className="mx-auto max-w-6xl px-5 pb-16">
        <div className="panel flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:p-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-good/12 text-good">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">
              How NamziLabs uses Google data
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
              For Google Sheets, NamziLabs uses <b>read-only</b> access to the
              spreadsheets you select to calculate your user-configured dashboard
              metrics. We only access files you choose, we never request write
              access, and users can disconnect integrations at any time.{" "}
              <b>NamziLabs does not sell Google user data.</b> Our use of
              information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noreferrer"
                className="text-brand-soft hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
            <div className="mt-3 flex gap-4 text-sm">
              <Link href="/privacy" className="text-brand-soft hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-brand-soft hover:underline">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="panel relative overflow-hidden p-8 text-center sm:p-12">
          <div
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(500px 200px at 50% 0%, rgba(255,255,255,0.06), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to unify your data?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted">
              Bring every tool into one dashboard and start tracking the metrics
              that matter.
            </p>
            <Link
              href="/login"
              className="btn-primary mx-auto mt-6 w-fit px-5 py-2.5 text-base"
            >
              Get started <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <div className="border-t border-panel-border py-8">
        <Footer />
      </div>
    </div>
  );
}
