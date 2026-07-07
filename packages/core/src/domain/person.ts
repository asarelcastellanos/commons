/**
 * The `Person` domain type — vertical-neutral and dialect-independent, mirroring
 * `./organization.ts`. A person is a ROSTER entry, not a login: no credentials or roles
 * ever live here. Staff accounts (owners, managers, leaders) that actually log in are a
 * separate model, added with auth — a Person can later be linked to one, but People
 * themselves never authenticate (ARCHITECTURE.md §7).
 *
 * Hand-written (rather than a Drizzle `$inferSelect`) so domain code never has to import a
 * specific dialect's tables.
 */

export interface Person {
  id: string;
  /**
   * The owning organization. Nullable because the foreign key is SET NULL, not CASCADE: a
   * person outlives the hard-deletion of their org rather than being erased with it (§5).
   */
  orgId: string | null;
  firstName: string;
  /** Optional — plenty of people go by a single name. */
  lastName: string | null;
  /** Optional contact info. `email` is what the messaging subsystem will blast to later. */
  email: string | null;
  phone: string | null;
  /** Freeform staff notes about this person. */
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Set when soft-deleted; history is never hard-deleted (§5). */
  deletedAt: Date | null;
}

/**
 * Fields accepted when creating a person; the rest are engine-generated. `orgId` and
 * `firstName` are required, everything else is optional.
 */
export type NewPerson = Pick<Person, "orgId" | "firstName"> &
  Partial<Pick<Person, "lastName" | "email" | "phone" | "notes">>;
