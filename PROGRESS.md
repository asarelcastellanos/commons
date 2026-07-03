# Commons — Progress & Handoff

> Working log to resume across sessions. The durable "why" lives in `ARCHITECTURE.md` and
> `docs/adr/`; this file is the "where we are / what's next". Last updated: 2026-07-02.

## Status at a glance

| Milestone (ARCHITECTURE.md §10) | State |
|---|---|
| **M0** — skeleton (workspace, TS, lint/CI, Drizzle wired) | ✅ done, green |
| **M1** — bedrock: data layer + Organization | ✅ done, green |
| **M1** — bedrock: **People roster** | ⏭️ **next up** |
| M2 — module registry (extract from org+people) | ⬜ not started |
| M3 — auth · M4 — walking skeleton · M5 — thicken core · M6 — first vertical | ⬜ |

**Everything is green on Node 24** (lint · format · typecheck · test · build). **Nothing is
committed to git yet** — first commit is pending the user's go-ahead (respect the
no-AI-attribution-in-commits rule).

## How to run (READ FIRST — Node version matters)

The machine's global `node` is **26** (Homebrew), which is *not* LTS and breaks
`better-sqlite3`'s native build. The project is pinned to **Node 24 LTS**, installed
**keg-only** at `/opt/homebrew/opt/node@24/bin` (there is no nvm/fnm). Prepend it to PATH
for every command in this repo:

```bash
export PATH="/opt/homebrew/opt/node@24/bin:$PATH"   # node -v should print v24.x
cd /Users/asarelcastellanos/Documents/commons

pnpm install                      # deps
pnpm lint && pnpm format:check    # quality
pnpm typecheck && pnpm test       # 13 tests should pass
pnpm build                        # tsc -b -> packages/core/dist

# database
pnpm --filter @commons/core db:generate     # builds, then generates BOTH dialects' migrations
pnpm --filter @commons/core db:migrate       # applies migrations for the DATABASE_URL dialect
```

(A smoother dev flow later: install `fnm`, or `brew link node@24`. Deferred for now.)

## What exists

```
commons/
├── package.json               # pnpm workspace root; engines: node >=24
├── pnpm-workspace.yaml         # packages/*  + allowBuilds (better-sqlite3, esbuild)
├── tsconfig.base.json          # strict, NodeNext ESM
├── eslint.config.js            # flat config + typescript-eslint + prettier
├── .nvmrc                      # 24
├── .env.example                # DATABASE_URL doc (postgres://… or file:…)
├── .github/workflows/ci.yml    # lint → format → typecheck → test → build (reads .nvmrc)
├── docs/adr/
│   ├── 0005-extract-registry-from-concrete-subsystems.md
│   └── 0006-dual-dialect-data-layer.md
└── packages/core/
    ├── drizzle.config.ts       # points at dist/*.js (see gotcha below)
    ├── drizzle/{sqlite,pg}/     # generated migrations (0000_* for organizations)
    └── src/
        ├── index.ts            # public exports
        ├── db/
        │   ├── dialect.ts      # resolveDialect() + sqliteFilename()  (+ .test.ts)
        │   ├── client.ts       # createDb()/getDb() -> dialect-discriminated Drizzle handle
        │   ├── migrate.ts      # per-dialect migration runner
        │   ├── columns/{sqlite,pg}.ts   # shared column vocabulary
        │   ├── schema.{sqlite,pg}.ts    # Organization table, mirrored per dialect
        │   ├── db.test.ts      # real SQLite CRUD (insert, soft-delete, unique slug)
        │   └── parity.test.ts  # fails if the two dialect schemas drift
        └── domain/organization.ts       # vertical-neutral domain type
```

## Key decisions made this session

- **Build from scratch**, clubkit/quorum as inspiration only (no code reused).
- **§10 rewritten** to the M0–M6 milestone table; **ADR-0005**: extract the module registry
  from two concrete subsystems (org + people), don't predict it.
- **ADR-0006 — data layer:** stay on Drizzle (fits self-host better than Prisma);
  **SQLite-primary via `better-sqlite3`**, Postgres via `pg`, one `DATABASE_URL` selects the
  engine; **two thin per-dialect schema files sharing a column vocabulary**, guarded by a
  parity test. `@libsql/client` considered and kept as a documented drop-in swap.
- **Node 24 LTS** pinned (self-host should run LTS; also fixes the better-sqlite3 build on
  the Node-26 machine).

### Gotchas to remember
- **drizzle-kit** can't resolve our NodeNext `.js` import specifiers to `.ts` files, so
  `drizzle.config.ts` points at compiled `dist/db/schema.*.js` and `db:generate` runs
  `build` first. (Node 24's `require(ESM)` makes this work.)
- `pnpm install` may re-prompt to approve native builds (`better-sqlite3`, `esbuild`) via
  `pnpm-workspace.yaml` → `allowBuilds`. Both are set to `true`.

## Next steps (tomorrow)

1. **Build the People roster** (finishes M1) — same pattern as Organization:
   - shared columns → `schema.{sqlite,pg}.ts` `people` table → migration → CRUD + parity tests
   - introduces the **first foreign key**: `orgId → organizations`, **set-null, never
     CASCADE** (§5); people are **loginless** (checked in via forms/QR, never authenticate).
2. With org + people both concrete, **design M2 (module registry)** by extracting the
   `Module`/`Vertical` contract from what they actually needed (ADR-0005).
3. When ready, **first git commit** (no AI attribution).

## Open questions / to revisit
- Postgres path is wired but only SQLite is exercised in tests. Add a CI job that runs the
  same CRUD suite against a Postgres service container (planned for later in M1/M5).
- Repository abstraction (so app code never branches on dialect) is intentionally deferred
  until there are real query call-sites (ADR-0005/0006).
