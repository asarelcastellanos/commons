# ADR 0003: Require a CLA and remain sole copyright holder

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Our model (ADR-0001) depends on being able to license the same code under AGPLv3 **and**,
where needed, under other terms (hosted service, optional commercial add-on modules).
That is only possible if a single party holds (or has broad relicensing rights over) the
copyright to all contributions. Outside contributions submitted under plain AGPL cannot be
relicensed by us.

## Decision

Require every contributor to agree to a **Contributor License Agreement** (see `CLA.md`)
that grants the maintainer a broad, sublicensable, relicensable copyright license —
explicitly including the right to distribute contributions under both AGPLv3 and separate
commercial terms. Contributors retain ownership of their work. Pair the CLA with DCO
sign-off (`git commit -s`) on every commit.

## Consequences

- The maintainer can run the hosted service and add commercial modules later without
  needing to re-contact every past contributor.
- Adds a small amount of contributor friction; mitigated by automating with CLA Assistant.
- Must be set up **before accepting the first external PR** — retrofitting consent is
  painful.
- The CLA text is a template (adapted from the Apache ICLA) and needs legal review before
  it is relied upon.

## Alternatives considered

- **DCO only (no CLA):** certifies provenance but grants no relicensing rights — would
  block the commercial/hosted flexibility the model needs. Rejected as insufficient alone;
  kept as a complement.
- **Full copyright assignment:** stronger for the maintainer but more hostile to
  contributors. Rejected in favor of a broad license grant.
