# Contributing to Commons

Thanks for wanting to help. Commons exists to give under-resourced communities the
software they've been priced out of — contributions keep that promise alive.

## Before you start: the CLA (required)

Every contributor must agree to the [Contributor License Agreement](CLA.md). It keeps the
project a single copyright holder so Commons can stay dependably open under AGPLv3.

Until [CLA Assistant](https://github.com/cla-assistant/cla-assistant) is wired up:

1. Add your name to the signature table at the bottom of [`CLA.md`](CLA.md) in your PR.
2. Sign off every commit with the Developer Certificate of Origin:
   ```bash
   git commit -s -m "your message"
   ```
   The `-s` adds a `Signed-off-by:` line certifying you wrote the code and have the right
   to submit it.

PRs without CLA agreement + sign-off can't be merged.

## Ground rules

- Be kind and constructive — we follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Discuss big changes in an issue **before** building them, so effort isn't wasted.
- Keep the engine **vertical-neutral** — audience-specific behavior belongs in a
  vertical package, never in the core engine.

## Code conventions

- **No emojis in code** (comments, logs, identifiers).
- **Comments explain _why_, not _what_.** Each file gets a top-of-file block comment
  explaining its purpose and how it fits the system.
- **TypeScript strict mode.** No `any` without a comment explaining why.
- **Never hard-delete historical data** (attendance, submissions). Use soft flags
  (`isCancelled`, `isDuplicate`) and set-null foreign keys.
- **Naming:** files/dirs `kebab-case`, components `PascalCase`, functions/vars
  `camelCase`, DB columns `snake_case`, env vars `SCREAMING_SNAKE_CASE`.

## Significant decisions

If you're proposing something with lasting consequences, open an issue to discuss the
reasoning first so it can be recorded before the change lands.
