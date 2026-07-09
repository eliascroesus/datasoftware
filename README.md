# Unived — Unified Data Tracking Platform

A Triple-Whale-style dashboard that pulls data from **all your tools into one
place**, timestamps everything, and lets you build any metric you want.

Connect **Close CRM, Calendly, SendBlue, Instantly, Google Sheets** and generic
**Webhooks**, then track things like accept rate, booking rate, SMS reply rate,
campaign reply rate, and custom spreadsheet metrics (e.g. *how many rows are
"Booked" vs "Not booked"*, close rate, pipeline value).

![Unived](https://img.shields.io/badge/Next.js-14-black) ![Postgres](https://img.shields.io/badge/Postgres-Prisma-blue)

---

## Features

- **Summary dashboard** — headline KPIs and per-source metric cards with trend
  sparklines, just like Triple Whale.
- **Integrations hub** — connect each tool with a guided form; test the
  connection, run a sync, and get a unique inbound webhook URL per source.
- **Metrics builder** — a Zapier-style configurator. Pick a source, a record
  type, a calculation (count / sum / average / unique / rate), and filter rules
  on any column. Live preview, then pin it to your dashboard.
- **Per-source drill-down** — deep view of each integration: metrics, a 30-day
  trend chart, a live records table, its webhook URL, and sync history.
- **Activity feed** — every timestamped record pulled or pushed, newest first.
- **Real connectors** — REST clients for each provider that run when you add
  credentials. Webhook ingestion for real-time data.
- **Scheduled syncs** — Vercel Cron hits `/api/cron/sync` to refresh everything.
- **Encrypted credentials** — API keys are AES-256-GCM encrypted at rest.

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Prisma · PostgreSQL.

---

## Getting started (local)

1. **Install**
   ```bash
   npm install
   ```
2. **Configure env** — copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — any Postgres (Neon, Supabase, local…)
   - `CREDENTIALS_SECRET` — `openssl rand -hex 32`
   - `CRON_SECRET` — `openssl rand -hex 24`
3. **Create the schema & seed demo data**
   ```bash
   npm run db:push
   npm run db:seed     # optional: rich demo data
   ```
4. **Run**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

---

## Deploy to Vercel

The build runs `prisma migrate deploy` automatically, so your production
database gets its tables on the **first deploy** — no manual schema step.

1. This branch is already on GitHub. In Vercel → **Add New… → Project** →
   import `eliascroesus/datasoftware`. (Framework preset: **Next.js** — detected
   automatically.)
2. Create a Postgres database and copy its connection string:
   - **Vercel Postgres** (Storage tab → Create → Postgres), or
   - **Neon** (neon.tech, free tier), or **Supabase**.
3. Set **Environment Variables** in the Vercel project (all environments):
   | Key | Required | Value |
   |-----|----------|-------|
   | `DATABASE_URL` | ✅ | your Postgres connection string |
   | `CREDENTIALS_SECRET` | ✅ | 32+ char random string (`openssl rand -hex 32`) |
   | `AUTH_PASSWORD` | ✅ | the password required to sign in |
   | `CRON_SECRET` | ✅ | random string (`openssl rand -hex 24`) |
   | `NEXT_PUBLIC_APP_URL` | recommended | your production URL (e.g. `https://unived.vercel.app`) |
   | `AUTH_SECRET` | optional | signs the session cookie; defaults to `CREDENTIALS_SECRET` |

   > Without `AUTH_PASSWORD` the app is **publicly reachable** and shows a warning
   > banner. Set it to turn on the login wall.
4. **Deploy.** On first build the schema is created automatically. Open the URL —
   you'll see the empty-state onboarding; head to **Integrations** to connect
   your first tool.
5. (Optional) Seed the rich demo dataset once, from your machine:
   ```bash
   DATABASE_URL="<prod url>" npm run db:seed
   ```
6. `vercel.json` registers a cron job that syncs every source on a schedule.
   Vercel injects `CRON_SECRET` as the `Authorization` header automatically.

> **Pooled connections:** if `DATABASE_URL` points at a connection pooler
> (Supabase pgBouncer, Neon `-pooler`), migrations may need the **direct**
> connection. Easiest fix: use the direct (non-pooled) URL for `DATABASE_URL`.

### Deploying from the CLI instead
```bash
npm i -g vercel
vercel link        # pick/create the project
vercel env add DATABASE_URL        # repeat for the other vars
vercel --prod
```

---

## How the connectors work

Each connector lives in `src/lib/connectors/` and implements a small interface:
`verify()`, `sync()`, and/or `handleWebhook()`. Everything they return is
normalised into two tables:

- **DataPoint** — numeric time-series (`metricKey`, `value`, `timestamp`) →
  powers KPI trends.
- **EventRecord** — row-level records (a lead, booking, SMS, campaign, sheet
  row, webhook payload) → what configurable metrics count and filter over.

| Connector | Sync | Webhook | Notes |
|-----------|------|---------|-------|
| Close CRM | ✅ | ✅ | Leads, opportunities, accept/win rate, pipeline value |
| Calendly | ✅ | ✅ | Bookings, cancellations, booking rate |
| SendBlue | — | ✅ | SMS sent/received + reply rate (webhook-driven) |
| Instantly | ✅ | ✅ | Campaign sent/open/reply rate, opportunities |
| Google Sheets | ✅ | ✅ | Pull rows; build metrics from specific columns |
| Webhook | — | ✅ | Catch data from Zapier/Make/n8n/custom code |

### Adding a new connector
Create a file in `src/lib/connectors/`, implement the `Connector` interface, and
register it in `src/lib/connectors/index.ts`. It automatically appears in the
Integrations hub with its own credential/config form.
