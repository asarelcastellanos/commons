import { defineConfig } from "drizzle-kit";

// Which dialect to generate for. Prefer an explicit COMMONS_DIALECT (set by the
// db:generate:* scripts); otherwise infer from DATABASE_URL.
//
// We point drizzle-kit at the COMPILED schema in `dist/` rather than the TypeScript
// source: its config loader resolves relative imports as CommonJS and can't follow our
// NodeNext `.js` specifiers to their `.ts` files, but it reads the emitted real `.js`
// fine. The db:generate scripts run `build` first. (Node 24's require(ESM) makes this
// work with our ESM output.)
const explicit = process.env.COMMONS_DIALECT;
const url = process.env.DATABASE_URL ?? "";
const isPostgres = explicit ? explicit === "postgres" : url.startsWith("postgres");

export default defineConfig(
  isPostgres
    ? { dialect: "postgresql", schema: "./dist/db/schema.pg.js", out: "./drizzle/pg" }
    : {
        dialect: "sqlite",
        schema: "./dist/db/schema.sqlite.js",
        out: "./drizzle/sqlite",
      },
);
