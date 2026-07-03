# Security Policy

Commons stores **personal data** — names, contact details, and (in some deployments)
information about minors. We treat security as a first-class concern.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Instead, report privately via GitHub's
[Private Vulnerability Reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
(Security tab → "Report a vulnerability"), or email the maintainer directly.

Please include:
- A description of the issue and its impact.
- Steps to reproduce (a proof of concept if possible).
- Affected version / commit.

We'll acknowledge within a few days and keep you updated. We ask for reasonable time to
release a fix before public disclosure, and we're happy to credit you.

## Security posture (baked into the design)

These are architectural commitments, not afterthoughts:

- **Encryption in transit** — deployments ship with TLS (Caddy auto-HTTPS for self-host).
- **Encryption at rest** — sensitive fields (e.g. phone numbers) supported via a
  field-encryption key; disk/volume encryption documented for self-host.
- **Backups are encrypted client-side** — the org holds the key, so backups are
  ciphertext only the org can read.
- **Least privilege** — members never authenticate; only staff do, keeping the auth
  surface small. Role-based access controls what staff can see.
- **No hard-deletes of historical data** — soft flags preserve integrity and auditability.
- **Secrets via environment/config**, never committed.

## Data controller responsibility

Commons is self-hosted software: the organization running it is the data controller and
owns compliance (GDPR/CCPA/etc.). We provide secure defaults and documentation so that's
as painless as possible.
