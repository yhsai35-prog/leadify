import { Router } from "express";
import { auditController } from "../controllers/auditController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole("admin"));

auditRouter.get("/", auditController.list);
