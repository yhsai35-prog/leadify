import { Router } from "express";
import { aiUsageQuerySchema } from "@bluwheelz/shared";
import { aiUsageController } from "../controllers/aiUsageController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const aiUsageRouter = Router();
aiUsageRouter.use(requireAuth, requireRole("super_admin"));

aiUsageRouter.get("/summary", validate(aiUsageQuerySchema, "query"), aiUsageController.summary);
aiUsageRouter.get("/by-user", validate(aiUsageQuerySchema, "query"), aiUsageController.byUser);
