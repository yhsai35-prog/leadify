import { Router } from "express";
import { z } from "zod";
import {
  createTenantSchema,
  updateTenantSchema,
  updateUserStatusSchema,
  uploadLogoSchema,
} from "@bluwheelz/shared";
import { tenantsController } from "../controllers/tenantsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

/** Platform-level tenant management. Super admin only. */
export const tenantsRouter = Router();
tenantsRouter.use(requireAuth, requireRole("super_admin"));

tenantsRouter.get("/", tenantsController.list);
tenantsRouter.post("/", validate(createTenantSchema), tenantsController.create);

// Demo requests come before /:id routes so "demo-requests" isn't parsed as an id.
tenantsRouter.get("/demo-requests", tenantsController.listDemoRequests);
tenantsRouter.patch(
  "/demo-requests/:requestId",
  validate(z.object({ status: z.enum(["new", "contacted", "closed"]) })),
  tenantsController.updateDemoRequestStatus,
);

tenantsRouter.patch("/:id", validate(updateTenantSchema), tenantsController.update);
tenantsRouter.post("/:id/logo", validate(uploadLogoSchema), tenantsController.uploadLogo);
tenantsRouter.get("/:id/users", tenantsController.listUsers);
tenantsRouter.patch("/:id/users/:userId/status", validate(updateUserStatusSchema), tenantsController.updateUserStatus);
