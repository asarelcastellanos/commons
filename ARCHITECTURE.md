# Commons — Architecture

> This is the map. When you feel lost, start here. It explains **what Commons is**,
> **how the pieces fit**, and **why** each decision was made. Keep it up to date as the
> real code diverges from the plan — a stale map is worse than none.

---

## 1. What Commons is (in one paragraph)

Commons is an **open-source engine for running a community**: a roster of people who
don't need to log in, recurring gatherings with attendance, money changing hands
(dues / donations / fees), mass messaging, and a public page — all self-hostable and
free under AGPLv3. On top of that one engine we will later ship **verticals**: tailored
products for specific audiences (clubs, volunteer programs, congregations, studios,
leagues, and so on). One engine, many faces. **This repository establishes the engine
and its foundation first; specific products are added later.**

**The test for any feature or product:** does this group *manage people, track their
participation, collect money, and message everyone — without those people needing
accounts?* If yes, it belongs on Commons.

---

## 2. The core idea: one engine, many verticals (NOT forks)

We do **not** fork the codebase per product. Forks diverge, force every fix to be
applied twice, and break the "one continuous update stream" promise. Instead:

```
                    ┌─────────────────────────────┐
                    │        packages/core         │   THE ENGINE (vertical-neutral)
                    │  orgs · people · auth        │
                    │  forms · events · attendance │
                    │  QR · messaging · public-page│
                    │  module-registry · data-layer│
                    │  theming · setup-wizard      │
                    └──────────────┬──────────────┘
                                   │  (core stays neutral; verticals plug in)
              ┌────────────────────┼────────────────────┐
              │                    │                    │
   ┌──────────▼─────────┐ ┌────────▼─────────┐ ┌────────▼──────────┐
   │ vertical (future)  │ │ vertical (future)│ │ vertical (future) │
   │ modules + preset   │ │ modules + preset │ │ modules + preset  │
   └──────────┬─────────┘ └──────────────────┘ └───────────────────┘
              │
     ┌────────▼────────┐         A "product" = core + ONE vertical package,
     │ app (future)    │         assembled at build time. Same source tree,
     │ = core + vert.  │         one place to fix bugs, every product inherits
     └─────────────────┘         every engine update automatically.
```

A **product** is `packages/core` + **one** vertical package, selected by config. This is
the VS Code (core + extensions) model, not the fork model.

**Key realization:** verticals are *thin*. Most difference between one community type and
another is the same feature with a different label (e.g. points↔hours, club↔org,
member↔participant) — that lives in core, configured via a terminology map. Only a
handful of things are genuinely vertical-specific and become that vertical's own modules.

---

## 3. Repository layout (monorepo)

```
commons/
├── packages/
│   └── core/                  # the engine — everything vertical-neutral
│                              # (vertical packages are added later, one per product)
├── docs/
│   └── adr/                   # Architecture Decision Records (why we chose things)
├── LICENSE                    # AGPLv3
├── CLA.md                     # Contributor License Agreement (keeps us sole copyright holder)
├── CONTRIBUTING.md
├── GOVERNANCE.md
├── SECURITY.md
├── BRANDING.md
└── ARCHITECTURE.md            # this file
```

Intended tooling (to wire up when coding starts): **pnpm workspaces** for the monorepo,
optionally **Turborepo** for task caching. Not set up yet — this is still the
foundation phase.

---

## 4. The core engine — subsystems

| Subsystem | Responsibility |
|---|---|
| **Org / tenancy** | The `Organization`. Everything is scoped to an org. Schema is multi-tenant-capable but runs fine single-tenant (one org row) for self-host. |
| **People roster** | The generic person record. People do **not** log in — they're checked in via forms/QR. |
| **Auth** | Staff/admin authentication ONLY. Must be **pluggable** — not hardwired to any hosted provider (see §7). |
| **Module registry** | The contract that lets verticals register features (tables, nav, routes, migrations) into core without core knowing about them. Keystone piece. |
| **Forms** | Form builder + submissions + duplicate detection. |
| **Events** | One-off + recurring (iCalendar RRULE) series → occurrences, each with its own check-in window + QR. |
| **Attendance / participation** | Check-in pipeline; a submission scoped to an occurrence. Credits (points/hours/etc.) awarded per event. |
| **QR** | Generate + `/r/<token>` redirect + scan analytics. |
| **Messaging** | Email (and later SMS) blasts + unsubscribe. Pluggable provider. |
| **Public page** | Slug-based public page with sections; the org's public face. |
| **Import / export** | CSV round-trip for the roster and submissions. |
| **Theming** | Token-based branding with a three-tier cascade (see §6). |
| **Setup wizard** | First-run (CLI or web): pick vertical, pick modules, set brand, seed the org. |
| **Data layer** | Drizzle ORM over Postgres **or** SQLite via one connection string (see §5). |

---

## 5. Data layer — one schema, Postgres or SQLite

- **Drizzle ORM** is the single source of truth for the schema.
- One connection string decides the engine:
  - `DATABASE_URL=postgres://…` → bundled/managed Postgres (default; growing orgs).
  - `DATABASE_URL=file:./data/commons.db` → SQLite (tiny orgs, one file, trivial backups).
- Modules own their own tables and migrations; the registry runs migrations only for
  **enabled** modules.
- **Historical data is never hard-deleted.** Use soft flags (`isCancelled`,
  `isDuplicate`) and set-null foreign keys, never `CASCADE DELETE`, on anything that
  carries attendance/submission history.

---

## 6. Theming — three-tier cascade

Branding resolves in three layers; the most specific wins:

```
Engine base defaults      (packages/core — neutral CSS custom-property tokens)
        ▼  overridden by
Vertical theme preset     (each product ships its own default palette + logo)
        ▼  overridden by
Org override              (the org's saved colors + logo, from the dashboard
                           OR seeded by the setup wizard on first boot)
```

- Tokens are CSS custom properties (`--primary`, `--foreground`, …) in the base layer.
- The org override is injected as inline CSS-variable overrides on the public page.
- **Scope is intentionally limited to accent colors + logo**, not a full re-skin —
  full arbitrary theming wrecks contrast/accessibility. Presets + two brand colors +
  logo covers ~95% of real needs.
- If no logo is set, fall back to the org name as a text wordmark.

---

## 7. Auth — the linchpin refactor

The core promise of Commons is a **free self-host tier a single volunteer can run** with
one command. A hosted-only auth dependency breaks that: it forces every self-hoster into
a third-party account and undermines "own your data". So:

- Core defines an **auth provider interface** (sign-in, session, current-staff-user).
- Ships with a **portable default** (e.g. Auth.js / Lucia / a small custom email+password
  layer) that runs anywhere with just the bundled database.
- A hosted deployment may swap in a managed provider behind the same interface.
- **Members never authenticate** — only staff. This keeps the auth surface tiny.

File storage should be S3-compatible (portable) and the DB is just Postgres/SQLite, so
**auth is the one subsystem that must be decoupled first.** It gates the whole
self-host story.

---

## 8. Distribution — two doors, one codebase

| | Self-host | Hosted SaaS (first-party) |
|---|---|---|
| Who runs it | The org (one volunteer) | You |
| Packaging | Docker Compose: `app + postgres + caddy` (Caddy auto-HTTPS); SQLite mode drops the db container | Multi-tenant deployment |
| Tenancy | Single-tenant (one org row) | Multi-tenant (many orgs, `orgId`-scoped) |
| Cost | Free (AGPLv3) | Paid — you charge for hosting/convenience/support, **not** the software |
| Data / PII liability | The org is the data controller | **You** are — needs an entity + DPAs |
| Backups | Bundled backup job → the org's own encrypted bucket, client-side encrypted, org holds the key | You run it |

The same schema supports both because it's multi-tenant-capable but degrades cleanly to
one org. The SaaS is *your own code hosted by you* — as copyright holder you have no
obligation to yourself, and AGPL's network clause stops competitors from strip-mining it.

---

## 9. Licensing & business model (settled)

- **Core: AGPLv3.** Anyone can self-host free forever. AGPL §13 closes the "SaaS
  loophole" — anyone offering it as a network service must release their modifications,
  protecting the hosted business from proprietary strip-mining.
- **First-party SaaS:** "I'll host it, you pay me." Charges for hosting/convenience/
  support, never for the software itself.
- **We stay sole copyright holder** via the **CLA** (`CLA.md`), preserving the right to
  run the SaaS and to add commercially-licensed modules later.
- **Trademark** the project name — AGPL grants code rights, not brand rights. Forks can
  copy the code but not the name or "the official hosted service."
- Lean **pure-open + paid hosting** over aggressive open-core, because the audience
  (nonprofits, community groups) is trust- and price-sensitive. Any premium add-ons stay
  "convenience," never core features.

See `docs/adr/0001-use-agplv3.md` and `docs/adr/0003-cla-and-copyright.md`.

---

## 10. Building order

Products (verticals) come later. The engine foundation comes first. The order is driven
by four principles:

1. **Nothing precedes the data layer.** Auth, the registry, and every subsystem write
   tables and run migrations. It is the literal bedrock.
2. **Don't design the module registry in a vacuum.** It is the keystone (§11) *and* the
   most abstract piece. Designed before any real subsystem exists, it will be wrong and
   over-built. Extract it from **two concrete subsystems**, don't predict it (ADR-0005).
3. **Race to a walking skeleton.** The thinnest end-to-end slice that proves the thesis —
   *a person participates without an account* — is the real integration test. Reaching it
   early flushes out architectural mistakes while they are still cheap.
4. **"Auth first" is a priority, not a commit order.** Auth gates the self-host story
   (§7, ADR-0004), but it needs the data layer, an org, and ideally the registry beneath
   it. Auth is the first *feature*, not the first line of code.

The milestones:

| # | Milestone | What ships | Why here |
|---|---|---|---|
| **M0** | **Skeleton** | pnpm workspace, TS, lint/CI, Drizzle wired to one connection string, a migration runner. Empty but it boots. | Prerequisite for everything. |
| **M1** | **Bedrock + two direct subsystems** | Data-layer conventions (`orgId` scoping, soft-delete only, dual Postgres/SQLite dialect). **Organization** (bootstrap-core root scope). **People roster** (built directly). | Gives two real subsystems to learn the pattern from before abstracting it. |
| **M2** | **Module registry** | Extract the `Module`/`Vertical` contract (§11) from what M1 actually needed. Retrofit people as the first *registered* module. | The keystone, extracted from concrete need, not guessed. Core dogfoods the same registry verticals use. |
| **M3** | **Auth** | Provider interface + portable default (email+password + sessions), built as a core module *through* the registry. Staff-only. | The self-host gate (§7). First real login. |
| **M4** | **Walking skeleton** | Event (single occurrence) → QR → Form → Attendance → roster shows the check-in. | Thinnest end-to-end slice; proves the architecture. |
| **M5** | **Thicken core** | Recurring events (RRULE), messaging (email + unsubscribe), theming cascade, public page, import/export, setup wizard. | Flesh out §4 once the spine holds. |
| **M6** | **First vertical** | Terminology map + theme preset + any genuinely vertical-specific module. | The engine is proven; now give it a face. |

When choosing the first vertical (M6), favor *least net-new code × most underserved
market*. If a proposed vertical needs a big new subsystem (payments, ticketing, video,
chat), it's a different product, not a Commons vertical.

---

## 11. Module registry — the contract (to design next)

The keystone. A vertical registers features through a single interface so core never
imports vertical code directly. Rough shape (final form TBD when coding starts):

```ts
type Module = {
  id: string;                 // "points", "dues", "scheduling"
  name: string;
  requires?: string[];        // other module ids this depends on
  tables?: Record<string, unknown>;   // Drizzle tables this module owns
  migrations?: string;        // path to this module's migrations
  nav?: NavItem[];            // dashboard nav entries it contributes
  routes?: RouteDef[];        // pages/handlers it mounts
};

type Vertical = {
  id: string;
  modules: Module[];
  terminology: TerminologyMap; // relabels neutral core terms for this audience
  themePreset: ThemePreset;    // default colors + logo + fonts
};
```

At boot: load the configured vertical → enable its modules → run only their migrations
→ mount their nav/routes → apply its terminology + theme preset (still overridable by
the org). Built at **M2**, extracted from the two concrete subsystems M1 delivers rather
than designed up front (§10, ADR-0005).

---

## 12. Where to look when you're lost

- **"Why did we choose X?"** → `docs/adr/`
- **"How do I contribute / what's the CLA?"** → `CONTRIBUTING.md`, `CLA.md`
- **"What's the big picture?"** → this file, §2 and §8
- **"What do I build next?"** → §10 (the M0→M6 milestone table), then §11 (module registry)
