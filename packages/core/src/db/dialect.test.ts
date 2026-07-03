import { describe, it, expect } from "vitest";
import { resolveDialect, sqliteFilename } from "./dialect.js";

describe("resolveDialect", () => {
  it("maps postgres URLs to postgres", () => {
    expect(resolveDialect("postgres://u:p@localhost:5432/commons")).toBe("postgres");
    expect(resolveDialect("postgresql://u:p@host/db")).toBe("postgres");
  });

  it("maps file/sqlite URLs and :memory: to sqlite", () => {
    expect(resolveDialect("file:./data/commons.db")).toBe("sqlite");
    expect(resolveDialect("sqlite:./commons.db")).toBe("sqlite");
    expect(resolveDialect("./data/commons.sqlite")).toBe("sqlite");
    expect(resolveDialect(":memory:")).toBe("sqlite");
  });

  it("throws when unset", () => {
    expect(() => resolveDialect(undefined)).toThrow(/DATABASE_URL is not set/);
    expect(() => resolveDialect("   ")).toThrow(/DATABASE_URL is not set/);
  });

  it("throws on an unrecognised scheme", () => {
    expect(() => resolveDialect("mysql://localhost/db")).toThrow(/Could not determine/);
  });
});

describe("sqliteFilename", () => {
  it("strips file:/sqlite: prefixes to a filesystem path", () => {
    expect(sqliteFilename("file:./data/commons.db")).toBe("./data/commons.db");
    expect(sqliteFilename("sqlite:/var/lib/commons.db")).toBe("/var/lib/commons.db");
    expect(sqliteFilename("./data/commons.db")).toBe("./data/commons.db");
  });

  it("passes :memory: through", () => {
    expect(sqliteFilename(":memory:")).toBe(":memory:");
    expect(sqliteFilename("file::memory:")).toBe(":memory:");
  });
});
