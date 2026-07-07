# @commons/core — the engine

Vertical-**neutral** engine that powers every Commons product. Nothing here may know
about a specific audience (a particular kind of club, program, or org) — that belongs in
a vertical package, added later.

## Subsystems (see `../../ARCHITECTURE.md` §4)

- Org / tenancy (multi-tenant-capable, degrades to single-tenant for self-host)
- People roster (loginless members)
- Auth (pluggable provider — **first thing to build**)
- Module registry (the contract verticals plug into — the keystone)
- Forms · Events (RRULE) · Attendance/QR · Messaging · Public page · CSV
- Theming (three-tier cascade) · Setup wizard · Data layer (Postgres/SQLite via Drizzle)

## Status

Foundation phase. Build order is the M0–M6 milestone table in `../../ARCHITECTURE.md` §10:
**skeleton → bedrock (data layer + org + people) → module registry → auth → walking
skeleton → thicken core → first vertical.**
