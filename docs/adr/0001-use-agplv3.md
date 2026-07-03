# ADR 0001: License the core under AGPLv3

- **Status:** accepted
- **Date:** 2026-07-02

## Context

Commons serves organizations priced out of commercial software. We need a license that
(a) guarantees the software is free to self-host forever, (b) keeps improvements open,
and (c) lets us sustain development with a first-party hosted service without a
competitor strip-mining that service.

## Decision

License the core engine under the **GNU Affero General Public License v3 (AGPLv3)**.

## Consequences

- Anyone can self-host free, forever — the mission is protected in the license itself.
- AGPL §13 closes the "SaaS loophole": anyone offering Commons as a network service must
  release their modifications, so no one can run a closed, improved competing SaaS.
- As sole copyright holder (secured via the CLA, ADR-0003) we are **not** bound by AGPL
  toward ourselves — we can offer a hosted service and, if desired, commercially-licensed
  add-on modules.
- Our own AGPL compliance is trivial: the source is already public, so offering it over a
  network is satisfied by linking to the repository.
- Some companies avoid AGPL dependencies; this mainly affects would-be proprietary
  embedders, which is an acceptable — even desirable — filter for this project.

## Alternatives considered

- **MIT/Apache:** maximally permissive, but allows proprietary strip-mining of a hosted
  service. Rejected — undermines sustainability.
- **BSL / SSPL / non-commercial (PolyForm):** would block the paid consultants/hosts that
  actually help nonprofits, and "non-commercial" is not open source. Rejected.
- **GPLv3 (not Affero):** doesn't cover the network/SaaS case, leaving the loophole open.
  Rejected in favor of AGPL.
