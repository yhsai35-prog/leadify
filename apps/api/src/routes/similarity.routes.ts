import { Router } from "express";
import { existingClientProfileParamSchema, similarityProspectsQuerySchema } from "@bluwheelz/shared";
import { similarityController } from "../controllers/similarityController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const similarityRouter = Router();

similarityRouter.use(requireAuth, requireRole("user"));

similarityRouter.get("/clients", similarityController.listClients);
similarityRouter.get(
  "/prospects",
  validate(similarityProspectsQuerySchema, "query"),
  similarityController.findProspects,
);
similarityRouter.get(
  "/clients/:companyId/profile",
  validate(existingClientProfileParamSchema, "params"),
  similarityController.getClientProfile,
);
