# NamziLabs — Project Handoff

This document is the primer for a fresh Claude Code session picking up this
repo. It covers what the app does today, the architecture, what shipped in the
last session, what's still open, known bugs, and the exact next task.

> **Repo:** `eliascroesus/datasoftware`
> **Working branch:** `claude/unified-data-tracking-e9gc1r` (do NOT push to any
> other branch without explicit permission).
> **Live domain:** `namzilabs.co` (Vercel).

---

## 1. What the application does

NamziLabs is a unified data-tracking platform in the spirit of Triple Whale.
It connects a user's business tools into one dashboard so they can see all
their metrics in one place with a configurable, Zapier-style metric builder.

**Product surfaces**
- **Public landing** at `/` — marketing homepage explaining the product,
  Google data-use section, links to `/privacy` and `/terms` (all public, for
  Google OAuth verification and general users).
- **Sign-in wall** at `/login` — password-protected via `AUTH_PASSWORD`.
- **Dashboard** at `/dashboard` — stat cards (records, events today, events
  bar chart), radial-gauge cards for rate metrics, colored sparkline cards
  with green/red deltas + "vs previous period", per-source card grid; range
  selector (Today / Yesterday / 7d / 30d / All time).
- **Integrations** at `/integrations` — connect a source; **Google Sheets
  uses OAuth ("Sign in with Google" → pick spreadsheet → tab → columns → date
  column)**; other sources take an API key/token. Every source gets a unique
  inbound webhook URL.
- **Metrics builder** at `/metrics` — Zapier-style: pick source + record type,
  choose aggregation (count / sum / avg / unique / ratio), filter rules with
  operator selection, values auto-suggest the actual observed values from the
  data (e.g. `Booked → Yes/No`). Sample Data panel shows real recent records;
  clicking a field maps it into a filter. Live preview. Goal + goal period
  (per day/week/month) with a "colour when below goal".
- **Per-source drill-down** at `/sources/[id]` — metrics for that source, a
  30-day area chart, records table, sync history, webhook URL.
- **Activity feed** at `/activity` — every timestamped record across sources.
- **Legal:** `/privacy` and `/terms` — public, include the Google Limited
  Use disclosure required for verification.

**Connectors (six)**
| Provider | Auth | Sync | Webhook |
|---|---|---|---|
| Google Sheets | OAuth or service-account/API-key | ✅ full-replace of the sheet | ✅ (via Apps Script) |
| Close CRM | API key (Basic) | ✅ | ✅ |
| Calendly | Personal Access Token | ✅ scoped by `user` URI | ✅ |
| Instantly | Bearer API key | ✅ campaigns analytics | ✅ |
| SendBlue | Webhook-driven | — | ✅ inbound/outbound with `contact` |
| Webhook (generic) | none | — | ✅ |

---

## 2. Architecture & folders

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Prisma · Postgres.
**Auth:** password-protected via a signed HMAC session cookie (Web Crypto so it
runs in Edge middleware and Node routes). Public paths: `/`, `/login`,
`/privacy`, `/terms`, `/api/webhooks/*`, `/api/cron/*`, `/api/health`,
`/api/auth/*`.
**Storage-first data model:** integrations feed the DB via sync or webhook;
time ranges are just SQL queries over stored records (no live re-pull on view).

```
src/
  app/
    (app)/              # authenticated shell — sidebar/topbar wrapper
      dashboard/         page.tsx
      integrations/      page.tsx + IntegrationsClient.tsx (connect modal)
      metrics/           page.tsx + MetricsClient.tsx (builder)
      activity/          page.tsx
      sources/[id]/      page.tsx (drill-down)
      layout.tsx         # gated shell
      error.tsx          # graceful DB-error UI
    api/
      auth/{login,logout}/route.ts
      cron/sync/route.ts               # daily cron endpoint (CRON_SECRET)
      fields/route.ts                   # legacy — kept for compatibility
      health/route.ts
      integrations/route.ts             # list + create
      integrations/[id]/route.ts        # get/update/delete
      integrations/[id]/sync/route.ts   # manual sync
      integrations/[id]/test/route.ts   # verify credentials
      integrations/[id]/sample/route.ts # recent 5 records for the builder
      integrations/[id]/google/route.ts # Drive/Sheets picker + disconnect
      metrics/route.ts                  # list + create
      metrics/[id]/route.ts             # patch/delete
      metrics/preview/route.ts          # compute unsaved metric
      oauth/google/{start,callback}/route.ts
      schema/route.ts                   # kinds, fields, examples, valuesByKind
      webhooks/[token]/route.ts         # generic ingestion endpoint
    login/                               # public sign-in page
    privacy/  terms/                     # public legal pages
    page.tsx                             # public marketing landing
    layout.tsx, globals.css, robots.ts, not-found.tsx
  components/
    Sidebar / MobileNav / Footer / LegalShell
    ProviderIcon / StatusPill / SetupBanner
    RangeSelector (calendar-style dropdown)
    Field / Combobox / CopyButton / SyncButton / DashboardActions
    RecordsTable / SampleData
    GoogleSheetsSetup (OAuth picker)
    MetricCard
    charts/Sparkline.tsx  charts/AreaChart.tsx  charts/Gauge.tsx  charts/MiniBars.tsx
  lib/
    auth.ts        # HMAC session helpers (edge-safe)
    config.ts      # getAppUrl / isConfigured
    crypto.ts      # AES-256-GCM for integration credentials
    db.ts          # PrismaClient singleton
    google.ts      # OAuth + Drive/Sheets API
    integrations.ts # CRUD + verify + Google token helpers
    metrics.ts      # computeMetric + resolveRange (windowed ratios/aggregates)
    sync.ts         # sync orchestrator + webhook ingestion + replace-mode
    dashboard.ts    # summary payload for /dashboard
    providers.ts    # provider colour/icon metadata + colorHex(token)
    client-types.ts # types shared between server + client components
    utils.ts        # cn, formatNumber, timeAgo, formatDate, pctChange
    connectors/
      types.ts, http.ts, index.ts (registry)
      close.ts calendly.ts sendblue.ts instantly.ts googleSheets.ts webhook.ts
  middleware.ts    # auth wall + public path allowlist
prisma/
  schema.prisma
  migrations/0_init/…
  migrations/1_add_goal_period/…    # adds MetricDefinition.goalPeriod, belowColor
  seed.ts (demo data — dev only)
vercel.json         # daily cron: 0 0 * * * → /api/cron/sync
.env.example        # full env template (safe to commit)
```

**Data model (Prisma):**
- `Integration` — provider, name, encrypted `credentials`, `config`, unique
  `webhookToken`, status, timestamps.
- `EventRecord` — per-row records (kind, externalId, title, JSON `data`,
  `occurredAt`). Unique (`integrationId`, `kind`, `externalId`).
- `DataPoint` — numeric time-series (metricKey, value, timestamp) for KPI
  trends.
- `MetricDefinition` — aggregation, recordKind, filters (JSON), valueField,
  color, goal, **goalPeriod, belowColor**, pinned.
- `SyncRun` — sync history per integration.

**Key design decisions**
- **Ingest once, store forever.** Range switches are SQL filters; we never
  re-hit integrations on view.
- **Sheet syncs use full-replace semantics** (delete + bulk-insert the current
  set) so counts always match the sheet.
- **Sheet rows keyed by position** (`row_N`) so no column value collapses
  rows into one; date-column drives timeline (`timestamp`, `date`,
  `meeting_date_time`, etc.).
- **Credentials AES-256-GCM encrypted at rest** (`CREDENTIALS_SECRET`).
- **Auth is single-tenant** (one password, `AUTH_PASSWORD`).

---

## 3. What was completed during the last session

Latest commits (newest first):
1. `54fb31d` — **Goal periods + below-goal colour, SendBlue robustness,
   unique repliers.** Metrics get `goalPeriod` (per day/week/month) and
   `belowColor`; builder UI added; MetricCard shows goal progress bar and
   recolours below goal. SendBlue webhook parses `is_outbound`/`direction`/
   `status` correctly, stores `contact`, ships a "People who replied"
   (unique) default metric. New migration `1_add_goal_period` applied.
2. `6301002` — **Dashboard redesign + Calendly fix + surface API errors.**
   Radial gauges for rate metrics, sparkline delta cards, events bar chart,
   source card grid, calendar-style range dropdown. Calendly scoped by
   `user` URI (was 400ing on empty `organization`). HTTP wrapper now
   surfaces provider error detail. Chart gradient IDs made deterministic
   (avoids hydration mismatch).
3. `037bf36` — **Fix sheet rows collapsing to one via the "unique key
   column".** Removed key-based dedup; sheet rows keyed by row position;
   that picker repurposed as an optional "Date column" for the timeline.
4. `c213c4a` — Timeline (Today/Yesterday/7d/30d/All), Google reconnect/
   switch account/disconnect, "Pull latest" that actually re-syncs, sheet
   full-replace + bulk insert + row-`occurredAt` from a date column,
   monochrome UI pass.
5. `12c90fa` — Public landing page (Google-verification friendly), rebrand
   Unived → NamziLabs, Zapier-style metric mapping with example values +
   distinct observed values (Yes/No), route restructure with `/dashboard`
   under `(app)` group.
6. `ef25a74` — Privacy & Terms pages (with Google Limited Use disclosure).
7. Earlier commits: Google Sheets OAuth picker, login wall + daily cron +
   hardening, Prisma migration + auto-migrate-on-deploy, initial platform.

---

## 4. Unfinished / potential next work (nothing is broken here)

Explicitly deferred pending user direction. Do NOT start these without a
confirmation:
1. **Conversation-depth SendBlue metric** — "replied after our Nth message"
   (needs thread grouping per `contact` and reply-depth logic). The user
   said "I don't know how to build that best," so any approach needs
   confirmation.
2. **External 15-min cron pinger** — Vercel Hobby's cron is daily only. A
   cron-job.org / GitHub Actions job hitting `/api/cron/sync` every 15 min
   with `CRON_SECRET` is the workaround; the user asked about it but did
   not tell us to build it.
3. **OAuth for Calendly** (parity with Google's 1-click flow — currently
   Personal Access Token).
4. **Webhook signature verification** (Stripe/SendBlue signing secrets).
5. **Login rate-limiting.**
6. **Multi-user auth** (currently single-tenant / single password).
7. **Alerts** (e.g. "reply rate dropped below X → email/Slack").
8. **Landing "Connect Google" CTA / demo screen-recording script for
   Google verification.**

---

## 5. Known bugs / caveats

- **None open in the code** as of `54fb31d`. Recent fixes covered:
  - Google Sheets showing "1 booked" — fixed (row-position keys + full
    replace).
  - Calendly 400 on sync — fixed (`user` scoping).
  - Dashboard client-side crash — fixed (deterministic gradient IDs; earlier
    crash was a stale-chunk artifact).
- **Env caveat:** Vercel only applies env-var changes to **new** deployments.
  After adding/changing `GOOGLE_CLIENT_ID`/`SECRET` or any other var, the
  user must redeploy for it to take effect (the app shows a yellow hint in
  the Sheets modal when the OAuth vars aren't visible).
- **Cron:** `vercel.json` uses `0 0 * * *` (daily) so it stays on Hobby.
  Sub-daily needs Pro or an external pinger.
- **Google OAuth "Testing" mode** rotates refresh tokens every ~7 days until
  the app is verified. Submitting for verification requires the
  `/privacy` + `/terms` URLs and `namzilabs.co` as the homepage (all
  already in place).
- **Local dev requires Postgres.** The current session initialised a local
  cluster at `/var/lib/pg-unived` on port 5433, socket `/tmp/pgsock`, owned
  by unprivileged user `pgrunner`, database `unived`, user `unived`, trust
  auth. To restart in a fresh container:
  ```bash
  PGBIN=$(ls -d /usr/lib/postgresql/*/bin | head -1)
  su pgrunner -c "$PGBIN/pg_ctl -D /var/lib/pg-unived \
    -o '-p 5433 -k /tmp/pgsock' -l /tmp/pglog.log start"
  ```
  If the data dir doesn't exist, reinit with `initdb -U unived --auth=trust`
  then `CREATE DATABASE unived;` and `npm run db:push`; optionally
  `npm run db:seed` for demo data.

---

## 6. Environment variables

The full list is in `.env.example`. Required in Vercel:
| Key | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | Postgres (Neon/Supabase/Vercel Postgres). Use the **direct** URL, not a pooler, so migrations work. |
| `CREDENTIALS_SECRET` | ✅ | 32+ char random — encrypts integration credentials at rest. |
| `AUTH_PASSWORD` | ✅ | The sign-in password. Without it, the app is open (a warning banner shows). |
| `CRON_SECRET` | ✅ | Protects `/api/cron/sync`. |
| `NEXT_PUBLIC_APP_URL` | recommended | e.g. `https://namzilabs.co`. |
| `AUTH_SECRET` | optional | Signs the session cookie. Defaults to `CREDENTIALS_SECRET`. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | optional | Enables 1-click Google Sheets. Redirect URI must be `https://<APP_URL>/api/oauth/google/callback`. |
| `NEXT_PUBLIC_CONTACT_EMAIL` | optional | Shown on `/privacy` + `/terms`. Defaults to `support@namzilabs.co`. |

---

## 7. Exact next task

**Confirm with the user which of the deferred items to build next.** The
recommended default is #1 (conversation-depth SendBlue tracking) since it's
the only genuine capability gap in the metrics builder — everything else
already has a working path. Do NOT start building any of items 1–8 without
an explicit go-ahead from the user; the last session ended with a question
asking which to pursue.
