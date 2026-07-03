# ADR 0002: One monorepo — core + vertical packages, not forks

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Commons will eventually power multiple products (verticals) for different community
types. We considered maintaining a separate fork per product. We also promised users a
single, continuous update stream they can always opt into.

## Decision

Keep **one monorepo**. A product is `packages/core` + **one** vertical package, assembled
at build time into a deployable app. Verticals register their features into core through
a **module registry**; core never imports vertical code. (Products themselves are added
later — this repo establishes the engine and structure first.)

## Consequences

- One place to fix bugs and ship security patches — every product inherits them.
- Preserves the "continuously updated, always opt-in, never breaks under you" promise.
- Core must stay strictly vertical-neutral (enforced by review). Audience-specific
  behavior lives only in vertical packages.
- Verticals are expected to be *thin*: most difference between community types is
  terminology plus a couple of modules, so the marginal cost of a new vertical is small.
- Requires monorepo tooling (pnpm workspaces, optionally Turborepo).

## Alternatives considered

- **Fork per product:** diverges over time, doubles every fix, breaks the single-update
  promise. Rejected.
- **Separate repos per package (polyrepo):** version-coordination overhead across core and
  verticals with no real benefit at this scale. Rejected for now.
