# ADR 0005: Extract the module registry from concrete subsystems, don't predict it

- **Status:** accepted
- **Date:** 2026-07-02

## Context

The module registry (ARCHITECTURE.md §11) is the keystone of the "one engine, many
verticals" model — the single contract through which a vertical registers tables,
migrations, nav, and routes into core without core importing vertical code. It is also
the most abstract piece in the system.

The original building order (§10) implied designing the registry up front, immediately
after auth. But a registry designed against **zero real consumers** is a guess: we would
be inventing the shape of `Module`/`Vertical` before knowing what a real subsystem needs
to register. The predictable outcome is an abstraction that is simultaneously over-built
(handling cases no subsystem has) and wrong (missing what the first real subsystem
actually requires), forcing a painful reshape once real code arrives.

## Decision

Build **two concrete subsystems directly first** — Organization (bootstrap-core) and the
People roster — without any registry. Then **extract** the registry contract from what
those two actually needed (their tables, migrations, nav entries, routes), and retrofit
People as the first *registered* module. Core subsystems, including auth, then register
through the same registry that verticals will use — so the abstraction is proven by its
own first clients before any vertical depends on it.

This reorders the build into milestones M0–M6 (§10): skeleton → bedrock + two direct
subsystems → registry (extracted) → auth → walking skeleton → thicken core → first
vertical.

## Consequences

- The registry is shaped by real need, not speculation — lower risk on the highest-risk
  piece.
- Org and People are built twice-ish: once directly, then People is adapted to register.
  This small, deliberate rework is cheaper than getting the keystone wrong.
- "Auth first" (ADR-0004) is reframed as a *priority* (it gates self-host) rather than a
  literal commit order: auth is the first feature, built at M3 on top of the data layer,
  org, and registry.
- Core dogfoods the registry from day one, guaranteeing verticals inherit the same power
  core has.

## Alternatives considered

- **Design the registry up front (original §10 order):** highest risk of a wrong
  abstraction with no real consumer to validate it. Rejected.
- **Never abstract; wire each subsystem directly forever:** breaks the "verticals plug in
  without core knowing about them" promise (§2). The registry is non-negotiable — the
  only question is *when*, and the answer is "after two concrete examples." Rejected.
