/**
 * Dialect parity guard (ADR-0006). The SQLite and Postgres schemas are hand-mirrored;
 * this fails CI the moment they drift on table name, columns, or core constraints —
 * which is what makes "two thin schema files" safe. Extend the TABLES list as entities
 * are added.
 */

import { describe, it, expect } from "vitest";
import { getTableConfig as sqliteTableConfig } from "drizzle-orm/sqlite-core";
import { getTableConfig as pgTableConfig } from "drizzle-orm/pg-core";
import { organizations as sqliteOrgs } from "./schema.sqlite.js";
import { organizations as pgOrgs } from "./schema.pg.js";

const TABLES = [{ name: "organizations", sqlite: sqliteOrgs, pg: pgOrgs }];

describe.each(TABLES)("$name parity", ({ sqlite, pg }) => {
  const s = sqliteTableConfig(sqlite);
  const p = pgTableConfig(pg);

  const byName = <T extends { name: string }>(xs: T[]) =>
    [...xs].map((x) => x.name).sort();
  const filteredByName = (
    cols: { name: string; notNull: boolean; primary: boolean }[],
    pred: (c: { notNull: boolean; primary: boolean }) => boolean,
  ) =>
    cols
      .filter(pred)
      .map((c) => c.name)
      .sort();

  it("has the same table name", () => {
    expect(s.name).toBe(p.name);
  });

  it("has the same set of columns", () => {
    expect(byName(s.columns)).toEqual(byName(p.columns));
  });

  it("agrees on NOT NULL columns", () => {
    expect(filteredByName(s.columns, (c) => c.notNull)).toEqual(
      filteredByName(p.columns, (c) => c.notNull),
    );
  });

  it("agrees on primary key columns", () => {
    expect(filteredByName(s.columns, (c) => c.primary)).toEqual(
      filteredByName(p.columns, (c) => c.primary),
    );
  });
});
