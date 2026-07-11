/**
 * Staff Users — the people who LOG IN to operate an org (owners, admins, ...). They are a
 * different thing from People (the roster, in ./person.ts), who never authenticate. A staff
 * user may optionally point at a Person via `personId`: that's the coordinator who is also a
 * member — one human = one Person (roster) + one linked StaffUser (login).
 *
 * Roles form a strict LADDER: every role can do everything the role beneath it can, plus one
 * more band of power. `hasAtLeast` is the single check every permission gate uses.
 */

/**
 * The role ladder, most-privileged first. These labels are core; a vertical may relabel them
 * for display via its terminology map, but the RANK (and therefore the permissions) is fixed.
 */
export const ROLES = ["owner", "admin", "organizer", "assistant", "viewer"] as const;

export type Role = (typeof ROLES)[number];

/** Higher number = more power. Each rung strictly contains every band below it. */
export const ROLE_RANK: Record<Role, number> = {
  owner: 4, // + billing, delete/transfer the org, manage admins
  admin: 3, // + org settings, modules, theme, manage staff below them
  organizer: 2, // + create/edit events, add/edit people, send messages
  assistant: 1, // + run check-in (record attendance)
  viewer: 0, //   view roster, events, reports (the base band)
};

/** True if `role` sits at or above `min` on the ladder — the workhorse permission check. */
export function hasAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/**
 * Whether `actor` may create or modify a user at `target` — only roles STRICTLY below their
 * own. (The owner-manages-owner / ownership-transfer case is a deliberate exception layered
 * on later in user-management logic.)
 */
export function canManage(actor: Role, target: Role): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

/** A staff user as domain code sees it. NEVER carries the password hash. */
export interface StaffUser {
  id: string;
  orgId: string | null;
  email: string;
  role: Role;
  /** Optional link to this person's roster row (a staffer who is also a member). */
  personId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Fields to create a staff user; the password itself is handled by the auth provider. */
export type NewStaffUser = Pick<StaffUser, "orgId" | "email" | "role"> &
  Partial<Pick<StaffUser, "personId">>;
