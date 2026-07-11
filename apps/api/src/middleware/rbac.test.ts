import { describe, expect, it } from "vitest";
import { UserRole } from "@bluwheelz/shared";
import { requireOwnSubmissionOrAdmin } from "./rbac.js";
import { ApiError } from "../utils/errors.js";

describe("requireOwnSubmissionOrAdmin", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const otherUserId = "22222222-2222-2222-2222-222222222222";

  it("allows a non-admin reviewer to decide on their own submission", () => {
    expect(() => requireOwnSubmissionOrAdmin(userId, userId, UserRole.USER)).not.toThrow();
  });

  it("throws when a non-admin reviewer tries to decide on someone else's submission", () => {
    expect(() => requireOwnSubmissionOrAdmin(userId, otherUserId, UserRole.USER)).toThrow(ApiError);
  });

  it("allows an admin to decide on any submission", () => {
    expect(() => requireOwnSubmissionOrAdmin(userId, otherUserId, UserRole.ADMIN)).not.toThrow();
  });

  it("allows a super_admin to decide on any submission", () => {
    expect(() => requireOwnSubmissionOrAdmin(userId, otherUserId, UserRole.SUPER_ADMIN)).not.toThrow();
  });
});
