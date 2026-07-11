import { Router } from "express";
import { discoveredLeadListQuerySchema, promoteDiscoveredLeadsSchema } from "@bluwheelz/shared";
import { discoveredLeadsController } from "../controllers/discoveredLeadsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const discoveredLeadsRouter = Router();
discoveredLeadsRouter.use(requireAuth);

discoveredLeadsRouter.get(
  "/",
  requireRole("user"),
  validate(discoveredLeadListQuerySchema, "query"),
  discoveredLeadsController.list,
);
discoveredLeadsRouter.post(
  "/promote",
  requireRole("user"),
  validate(promoteDiscoveredLeadsSchema),
  discoveredLeadsController.promote,
);
