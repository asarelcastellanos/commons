import { describe, it, expect } from "vitest";
import { canManage, hasAtLeast, ROLE_RANK, ROLES } from "./staff-user.js";

describe("role ladder", () => {
  it("is ordered owner > admin > organizer > assistant > viewer, strictly descending", () => {
    expect(ROLES).toEqual(["owner", "admin", "organizer", "assistant", "viewer"]);
    const ranks = ROLES.map((r) => ROLE_RANK[r]);
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i - 1]).toBeGreaterThan(ranks[i]);
    }
  });

  it("hasAtLeast is inclusive and follows the ladder", () => {
    expect(hasAtLeast("owner", "viewer")).toBe(true);
    expect(hasAtLeast("organizer", "organizer")).toBe(true);
    expect(hasAtLeast("assistant", "organizer")).toBe(false);
  });

  it("canManage allows only strictly-lower roles", () => {
    expect(canManage("admin", "organizer")).toBe(true);
    expect(canManage("owner", "admin")).toBe(true);
    expect(canManage("admin", "admin")).toBe(false);
    expect(canManage("viewer", "viewer")).toBe(false);
  });
});
