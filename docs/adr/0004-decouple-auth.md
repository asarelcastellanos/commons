# ADR 0004: Decouple authentication from any hosted provider

- **Status:** accepted
- **Date:** 2026-07-02

## Context

The core promise of Commons is a **free self-host tier a single volunteer can run** with
one command. A hosted-only auth dependency breaks that: it forces every self-hoster into
a third-party account and undermines "own your data". File storage can be S3-compatible
(portable) and the database is just Postgres/SQLite — **auth is the one piece that
doesn't travel** if it's tied to a hosted provider.

## Decision

Define an **auth provider interface** in core (sign-in, session, current-staff-user) with
a **portable default implementation** (Auth.js / Lucia / a small custom email+password
layer) that runs with only the bundled database. Hosted deployments may swap in a managed
provider behind the same interface. Members never authenticate — only staff — keeping the
surface minimal.

## Consequences

- Unlocks true one-command self-host; nothing external required.
- This is the **first engine refactor** to tackle — the rest of the self-host story
  (Docker Compose, SQLite mode, backups) depends on it.
- We own more of the auth surface (password reset, sessions, email verification), which is
  security-sensitive and must be done carefully.

## Alternatives considered

- **Self-host a full hosted-auth stack:** heavy to run, contradicts "one volunteer,
  simple". Rejected.
- **Hardwire a hosted auth provider, hosted-only product:** abandons the free self-host
  tier that is the reason the project exists. Rejected.
