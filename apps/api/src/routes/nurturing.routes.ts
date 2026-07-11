import { Router } from "express";
import { nurturingListQuerySchema } from "@bluwheelz/shared";
import { nurturingController } from "../controllers/nurturingController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const nurturingRouter = Router();
nurturingRouter.use(requireAuth, requireRole("admin"));

nurturingRouter.get("/", validate(nurturingListQuerySchema, "query"), nurturingController.list);
