# Commons — Progress & Handoff

> Working log to resume across sessions. The durable "why" lives in `ARCHITECTURE.md`;
> this file is the "where we are / what's next". Last updated: 2026-07-02.

## Status at a glance

| Milestone (ARCHITECTURE.md §10) | State |
|---|---|
| **M0** — skeleton (workspace, TS, lint/CI, Drizzle wired) | ✅ done, green |
| **M1** — bedrock: data layer + Organization + **People roster** | ✅ done, green |
| M2 — module registry (extract from org+people) | ⏭️ **next up** |
| M3 — auth · M4 — walking skeleton · M5 — thicken core · M6 — first vertical | ⬜ |

**Everything is green on Node 24** (lint · format · typecheck · test · build). The M0/M1
foundation is committed; keep the no-AI-attribution rule on future commits.

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
└── packages/core/
    ├── drizzle.config.ts       # points at dist/*.js (see gotcha below)
    ├── drizzle/{sqlite,pg}/     # generated migrations (0000_* orgs, 0001_* people)
    └── src/
        ├── index.ts            # public exports
        ├── db/
        │   ├── dialect.ts      # resolveDialect() + sqliteFilename()  (+ .test.ts)
        │   ├── client.ts       # createDb()/getDb() -> dialect-discriminated Drizzle handle
        │   ├── migrate.ts      # per-dialect migration runner
        │   ├── columns/{sqlite,pg}.ts   # shared column vocabulary (id, audit, deletedAt, orgId)
        │   ├── schema.{sqlite,pg}.ts    # organizations + people tables, mirrored per dialect
        │   ├── db.test.ts      # org CRUD (insert, soft-delete, unique slug)
        │   ├── people.test.ts  # people CRUD + first FK (org-delete -> org_id set null)
        │   └── parity.test.ts  # fails if the two dialect schemas drift
        └── domain/{organization,person}.ts   # vertical-neutral domain types
```

## Key decisions made this session

- **Built from scratch** — no external code reused.
- **§10** is the M0–M6 milestone table; the module registry is **extracted from two
  concrete subsystems** (org + people) rather than designed up front.
- **Data layer:** Drizzle ORM; **SQLite-primary via `better-sqlite3`**, Postgres via `pg`,
  one `DATABASE_URL` selects the engine; **two thin per-dialect schema files sharing a
  column vocabulary**, guarded by a parity test. `@libsql/client` is a documented drop-in
  swap for SQLite.
- **Node 24 LTS** pinned (self-host should run LTS; also fixes the better-sqlite3 native
  build on the Node-26 machine).

### Gotchas to remember
- **drizzle-kit** can't resolve our NodeNext `.js` import specifiers to `.ts` files, so
  `drizzle.config.ts` points at compiled `dist/db/schema.*.js` and `db:generate` runs
  `build` first. (Node 24's `require(ESM)` makes this work.)
- `pnpm install` may re-prompt to approve native builds (`better-sqlite3`, `esbuild`) via
  `pnpm-workspace.yaml` → `allowBuilds`. Both are set to `true`.

## Next steps

1. **M1 is complete** — organizations + people are both concrete (org-scoped, soft-delete,
   dual-dialect, parity-guarded). People is **loginless** by design: login + roles are a
   separate **Staff User** model that arrives with auth (M3), never on the person row.
2. With org + people both concrete, **design M2 (module registry)** by extracting the
   `Module`/`Vertical` contract from what they actually needed, then move people onto it as
   the first *registered* module.
3. When ready, commit the People roster (no AI attribution).

## Open questions / to revisit
- Postgres path is wired but only SQLite is exercised in tests. Add a CI job that runs the
  same CRUD suite against a Postgres service container (planned for later in M5).
- Repository abstraction (so app code never branches on dialect) is intentionally deferred
  until there are real query call-sites.
- **Staff User model** (login + role hierarchy: owner/manager/leader) is deferred to M3;
  it will carry an optional `personId` link to a roster row. `§4` should gain an explicit
  "Staff User" entry to record this split.
