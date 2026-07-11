import type { NextFunction, Request, Response } from "express";
import { ROLE_RANK, UserRole, type UserRole as UserRoleType } from "@bluwheelz/shared";
import { ApiError } from "../utils/errors.js";

/**
 * Threshold-based role check: `requireRole('admin')` allows admin and
 * super_admin, but not user. Use `requireExactRole` for the rare case where a
 * lower-ranked role should NOT be implicitly included (none currently, but
 * kept for future modules like "user-only" self-service actions that admins
 * shouldn't be nudged into doing on someone's behalf).
 */
export function requireRole(minimumRole: UserRole) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();
    if (ROLE_RANK[req.user.role] < ROLE_RANK[minimumRole]) {
      throw ApiError.forbidden(`This action requires the "${minimumRole}" role or higher.`);
    }
    next();
  };
}

/**
 * Approval queue visibility for a `user` role is scoped to outreach they
 * generated and submitted themselves (see `approvalService.scopeToViewer`),
 * so they review and approve their own drafts directly -- there is no
 * separate reviewer role in the single-tenant MVP workflow. This guard is
 * the corresponding write-side check: a non-admin may only decide on an
 * approval item they submitted themselves; admins and super admins may
 * decide on any item, including other users' submissions.
 */
export function requireOwnSubmissionOrAdmin(
  submittedBy: string,
  reviewerId: string,
  reviewerRole: UserRoleType,
): void {
  const isAdmin = ROLE_RANK[reviewerRole] >= ROLE_RANK[UserRole.ADMIN];
  if (isAdmin) return;
  if (submittedBy !== reviewerId) {
    throw ApiError.forbidden("You can only approve or reject outreach you submitted yourself.");
  }
}
