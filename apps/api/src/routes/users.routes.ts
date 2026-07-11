import { Router } from "express";
import { inviteUserSchema, updateUserRoleSchema, updateUserStatusSchema } from "@bluwheelz/shared";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);
// Listing is admin+ (used by dashboard/nurturing user pickers). Inviting,
// changing roles, disabling, and removing users is also admin+ (super_admin
// inherits). All of these are scoped to the caller's own tenant.
usersRouter.get("/", requireRole("admin"), authController.listUsers);
usersRouter.post("/invite", requireRole("admin"), validate(inviteUserSchema), authController.inviteUser);
usersRouter.patch("/:id/role", requireRole("admin"), validate(updateUserRoleSchema), authController.updateUserRole);
usersRouter.patch("/:id/status", requireRole("admin"), validate(updateUserStatusSchema), authController.setUserStatus);
usersRouter.delete("/:id", requireRole("admin"), authController.removeUser);
