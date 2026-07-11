import { Router } from "express";
import { emailIdParamSchema, scheduleEmailSchema, updateEmailSchema } from "@bluwheelz/shared";
import { outreachController } from "../controllers/outreachController.js";
import { approvalController } from "../controllers/approvalController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { aiRateLimit } from "../middleware/rateLimit.js";

export const emailsRouter = Router();
emailsRouter.use(requireAuth);
emailsRouter.use("/:id", validate(emailIdParamSchema, "params"));

emailsRouter.patch("/:id", requireRole("user"), validate(updateEmailSchema), outreachController.update);
emailsRouter.post("/:id/regenerate", requireRole("user"), aiRateLimit, outreachController.regenerate);
emailsRouter.post("/:id/submit", requireRole("user"), approvalController.submit);
emailsRouter.post("/:id/schedule", requireRole("admin"), validate(scheduleEmailSchema), approvalController.schedule);
emailsRouter.post("/:id/confirm-sent", requireRole("user"), approvalController.confirmSent);
