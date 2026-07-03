/**
 * @commons/core — the Commons engine (vertical-neutral). See ../../ARCHITECTURE.md.
 *
 * M1 exposes the data-layer seam and the first domain model. Subsystems and the module
 * registry land from M2 onward.
 */

export { resolveDialect, sqliteFilename, type Dialect } from "./db/dialect.js";
export { createDb, getDb, type Db, type SqliteDb, type PgDb } from "./db/client.js";
export type { Organization, NewOrganization } from "./domain/organization.js";
