/**
 * The `Organization` domain type — vertical-neutral and dialect-independent. Both dialect
 * schemas infer to this shape; keeping it hand-written (rather than re-exporting a
 * Drizzle `$inferSelect`) means domain code never imports a specific dialect's tables.
 */

export interface Organization {
  id: string;
  name: string;
  /** URL-safe handle for the org's public page (ARCHITECTURE.md §8). */
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  /** Set when soft-deleted; history is never hard-deleted (§5). */
  deletedAt: Date | null;
}

/** Fields accepted when creating an org; the rest are engine-generated. */
export type NewOrganization = Pick<Organization, "name" | "slug">;
