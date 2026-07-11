# Commons — Progress & Handoff

> Working log to resume across sessions. The durable "why" lives in `ARCHITECTURE.md`;
> this file is the "where we are / what's next". Last updated: 2026-07-11.

## Status at a glance

| Milestone (ARCHITECTURE.md §10) | State |
|---|---|
| **M0** — skeleton (workspace, TS, lint/CI, Drizzle wired) | ✅ done, green |
| **M1** — bedrock: data layer + Organization + **People roster** | ✅ done, green |
| **M2** — auth & staff users (provider + email/password + sessions + roles) | ✅ done, green |
| **M3** — walking skeleton (app/runtime seam + Event→QR→Form→Attendance) | ⏭️ **next up** |
| M4 — module registry · M5 — thicken core · M6 — first vertical | ⬜ |

> **Ordering changed (2026-07-07):** the module registry moved from M2 to M4. Org + People
> are both data-only and reveal only half of a "module" (tables/migrations, not routes/
> sessions/optionality). Auth moves up to M2 so the registry is later extracted from four
> varied subsystems (org, people, auth, events), not guessed from two thin ones. See
> ARCHITECTURE.md §10.

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
    ├── drizzle/{sqlite,pg}/     # migrations: 0000 orgs, 0001 people, 0002 users+sessions
    └── src/
        ├── index.ts            # public exports
        ├── db/
        │   ├── dialect.ts      # resolveDialect() + sqliteFilename()  (+ .test.ts)
        │   ├── client.ts       # createDb()/getDb() -> dialect-discriminated Drizzle handle
        │   ├── migrate.ts      # per-dialect migration runner
        │   ├── columns/{sqlite,pg}.ts   # shared column vocabulary (id, audit, deletedAt, orgId)
        │   ├── schema.{sqlite,pg}.ts    # organizations · people · users · sessions, per dialect
        │   ├── db.test.ts · people.test.ts · parity.test.ts
        ├── auth/
        │   ├── password.ts     # scrypt hash/verify (node:crypto, no deps)  (+ .test.ts)
        │   ├── provider.ts     # AuthProvider + AuthStore interfaces
        │   └── local.ts        # portable default: email+pw + opaque sessions  (+ .test.ts)
        └── domain/{organization,person,staff-user}.ts   # vertical-neutral domain types
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

1. **M1 + M2 are complete.** Org + People (loginless roster) and Auth & Staff Users (users
   with the 5-role ladder, opaque sessions, scrypt provider behind a swappable interface).
2. **Build M3 — walking skeleton.** A minimal app/runtime seam (HTTP + routes) so staff can
   log in and operate; then Event (single occurrence) → QR → Form → Attendance → the roster
   shows the check-in. This is the first thing with real routes/nav, and it's what makes the
   M4 module registry extractable.
3. When ready, commit each subsystem (no AI attribution).

## Auth roadmap — earmarked "batteries" (keep our own default; adopt a lib behind the seam)

**Decision (2026-07-07):** keep our zero-dependency scrypt + opaque-session default — it's
green, self-host-friendly, and already matches Better Auth's own crypto choices. When the
heavier features below are needed, adopt **Better Auth _behind_ the `AuthProvider` interface**
(MIT-licensed; scrypt by default), mapping its `user` to our staff user via `additionalFields`
(orgId, role, personId). **Do NOT adopt its organization plugin** — our `organizations` /
`people` / 5-role ladder stay core; tenancy is an engine concept, not an auth-lib concern.

Done now: session `ip_address` / `user_agent` capture; login timing-equalization (enum guard).

| Battery to add | Why | Earliest fit |
|---|---|---|
| Rate-limiting / lockout | brute-force defense | M3 (with HTTP layer) |
| CSRF + secure cookies (HttpOnly/Secure/SameSite) | browser session safety | M3 (with HTTP layer) |
| Password strength + breach (HIBP) check | reject weak/pwned passwords | M3–M5 |
| Email verification | confirm ownership before access | M5 (needs messaging) |
| Password reset | table-stakes recovery | M5 (needs messaging) |
| Staff invitations (email a role) | onboard staff without sharing passwords | M5 (needs messaging) |
| Session audit + revoke-all (uses ip/ua/last-seen) | account security | M5 |
| 2FA / TOTP + passkeys | stronger staff auth | post-M5 |
| OAuth / social login | optional convenience (hosted tier) | post-M5 |

Grade the above against **OWASP ASVS** as the checklist.

## Open questions / to revisit
- Postgres path is wired but only SQLite is exercised in tests (incl. the auth store — only
  `sqliteAuthStore` exists; a `pgAuthStore` is the mirror task). Add a CI job that runs the
  suite against a Postgres service container (planned for M5).
- Repository abstraction (so app code never branches on dialect) is intentionally deferred
  until there are real query call-sites.
- `§4` should gain an explicit **Staff User** entry (distinct from Auth-the-mechanism), to
  record the People-vs-Users split in the subsystem table.
