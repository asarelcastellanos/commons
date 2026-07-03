# ADR 0006: Dual-dialect data layer — Drizzle, SQLite-primary, shared column vocabulary

- **Status:** accepted
- **Date:** 2026-07-02
- **Runtime:** Node 24 LTS (see `.nvmrc`, `engines`)

## Context

ARCHITECTURE.md §5 promises *one schema, Postgres **or** SQLite, chosen by one connection
string*. Self-host is the primary driver of the project (ADR-0004), and self-host runs on
SQLite ("one file, trivial backups"); the hosted tier runs on Postgres. Most development
and testing happens locally against SQLite, with Postgres validated separately.

Two frictions surfaced:

1. **Drizzle has no single dual-dialect table type.** `pg-core` and `sqlite-core` tables
   are distinct types, because the engines genuinely differ — SQLite has no native
   `uuid`, `jsonb`, array, `boolean`, or timezone-aware timestamp. *Any* tool must
   reconcile this; Prisma hides it by forcing the common subset (and ships a heavy query
   engine, at odds with lightweight self-host). Drizzle makes it explicit but lets us
   share definitions — and stays SQL-first with no runtime engine.
2. **Node version.** The dev machine was on Node 26 ("Current", not LTS until ~Oct 2026),
   where `better-sqlite3` has no prebuilt yet (ABI 147) and falls back to a fragile
   node-gyp compile. A stable self-host project should target an LTS regardless — so we
   pin to **Node 24 LTS**, where `better-sqlite3` ships working prebuilts.

## Decision

- **Stay on Drizzle.** It fits the self-host ethos better than the alternatives.
- **Pin to Node 24 LTS** (`.nvmrc`, `engines: node >=24`, CI reads `.nvmrc`). Self-hosters
  and the Docker image run an LTS, not a "Current" release.
- **SQLite is the primary engine** for dev, test, and self-host; Postgres serves the
  hosted tier and is validated in CI.
- **SQLite driver: `better-sqlite3`** (`drizzle-orm/better-sqlite3`) — the canonical
  single-file driver §5 describes, in-process and fastest, with prebuilts on Node 24 LTS.
  It is **synchronous** while `pg` is async; that difference is contained behind the
  per-dialect repository layer (deferred, ADR-0005) and never reaches call-sites.
  `@libsql/client` remains a drop-in swap behind the identical `sqlite-core` schema if we
  later want async-uniformity or edge/replica support.
- **Dual dialect via a shared column vocabulary, not a table-compiler.** Each entity is
  defined once per dialect (`schema.sqlite.ts`, `schema.pg.ts`) using native Drizzle
  builders — preserving full type-safe queries — but its columns come from one shared
  helper set (`columns/sqlite.ts`, `columns/pg.ts`) encoding the common-type mapping:
  uuid→text, timestamp→epoch-int, (later) json→text, bool→int. A **parity test** fails
  CI the moment the two schemas drift in table or column names.
- **Conventions (§5):** every row carries `id` (uuid), `createdAt`/`updatedAt` audit
  timestamps; history is never hard-deleted — soft flags (`deletedAt`, and domain flags
  like `isCancelled`/`isDuplicate`) plus set-null FKs, never `CASCADE DELETE`.

A generic repository abstraction (so app code never branches on dialect) is deferred until
there are real query call-sites — per ADR-0005, we extract it from concrete need rather
than predict it. Until then, the strategy is "settled" as: shared vocabulary + per-dialect
schema + parity test + per-dialect migrations.

## Consequences

- Both engines work and are tested from day one; self-host is not deferred.
- Two schema files exist per entity, but they are thin (columns come from the shared
  vocabulary) and a parity test prevents drift — the small cost ADR-0005 accepts.
- No native-build fragility on new Node versions; contributors and self-hosters install
  cleanly.
- The async/uniform surface means Postgres and SQLite call-sites look identical.

## Alternatives considered

- **Pivot to Prisma for its single-schema multi-provider story:** its migration history is
  provider-locked anyway (no free dual-target), and its Rust query-engine binary weighs on
  the self-host image. Rejected.
- **`@libsql/client` as the SQLite driver:** async-uniform with `pg` and broad prebuilt
  coverage, but an extra layer over vanilla SQLite. Once the compile issue was removed by
  pinning Node 24 LTS, the decision turned on canonical-single-file simplicity, which
  `better-sqlite3` wins. Kept as a documented drop-in swap.
- **Staying on Node 26 ("Current"):** not LTS until ~Oct 2026; wrong base for a
  stability-focused self-host project, and the source of the `better-sqlite3` compile
  friction. Rejected.
- **A generic table-compiler (define once, generate both dialects):** loses Drizzle's type
  inference and over-engineers ahead of need (ADR-0005). Rejected.
