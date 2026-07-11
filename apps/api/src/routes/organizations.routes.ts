import { Router } from "express";
import { updateOrganizationSettingsSchema, uploadLogoSchema } from "@bluwheelz/shared";
import { organizationsController } from "../controllers/organizationsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

// Tenant admins manage their own organization's settings and branding.
// Cross-tenant management lives under /v1/tenants (super_admin only).
export const organizationsRouter = Router();
organizationsRouter.use(requireAuth, requireRole("admin"));

organizationsRouter.get("/current", organizationsController.getCurrent);
organizationsRouter.patch("/current", validate(updateOrganizationSettingsSchema), organizationsController.updateCurrent);
organizationsRouter.post("/current/logo", validate(uploadLogoSchema), organizationsController.uploadLogo);
organizationsRouter.delete("/current/logo", organizationsController.removeLogo);
