import type { Request } from "express";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";

export interface AnalyticsScope {
  userId?: string;
  from: Date;
  to: Date;
  isOrgWide: boolean;
}

const DEFAULT_RANGE_MS = 30 * 24 * 60 * 60 * 1000;

export function resolveAnalyticsScope(req: Request): AnalyticsScope {
  const canDrillDown = ROLE_RANK[req.user!.role] >= ROLE_RANK[UserRole.ADMIN];
  const requestedUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;

  let userId: string | undefined;
  let isOrgWide: boolean;
  if (canDrillDown) {
    userId = requestedUserId;
    isOrgWide = !requestedUserId;
  } else {
    userId = req.user!.id;
    isOrgWide = false;
  }

  const to = typeof req.query.to === "string" ? new Date(req.query.to) : new Date();
  const from =
    typeof req.query.from === "string"
      ? new Date(req.query.from)
      : new Date(to.getTime() - DEFAULT_RANGE_MS);

  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  return { userId, from, to, isOrgWide };
}
