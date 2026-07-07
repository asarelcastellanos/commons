/**
 * Dialect parity guard. Because each entity is hand-written twice — once for SQLite, once
 * for Postgres — the two could silently fall out of sync. This test fails the moment they
 * drift on table name, column set, or core constraints (NOT NULL, primary key), which is
 * what makes maintaining "two thin schema files" safe. Add each new entity to the TABLES
 * list below.
 */

import { describe, it, expect } from "vitest";
import { getTableConfig as sqliteTableConfig } from "drizzle-orm/sqlite-core";
import { getTableConfig as pgTableConfig } from "drizzle-orm/pg-core";
import { organizations as sqliteOrgs, people as sqlitePeople } from "./schema.sqlite.js";
import { organizations as pgOrgs, people as pgPeople } from "./schema.pg.js";

const TABLES = [
  { name: "organizations", sqlite: sqliteOrgs, pg: pgOrgs },
  { name: "people", sqlite: sqlitePeople, pg: pgPeople },
];

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
