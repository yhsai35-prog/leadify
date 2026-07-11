import { Router } from "express";
import {
  addLeadsToCampaignSchema,
  campaignIdParamSchema,
  createCampaignSchema,
  launchCampaignSchema,
  removeLeadsFromCampaignSchema,
  updateCampaignSchema,
} from "@bluwheelz/shared";
import { campaignsController } from "../controllers/campaignsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);
campaignsRouter.use("/:id", validate(campaignIdParamSchema, "params"));

campaignsRouter.get("/", requireRole("user"), campaignsController.list);
campaignsRouter.post("/", requireRole("admin"), validate(createCampaignSchema), campaignsController.create);
campaignsRouter.get("/:id", requireRole("user"), campaignsController.detail);
campaignsRouter.patch("/:id", requireRole("admin"), validate(updateCampaignSchema), campaignsController.update);
campaignsRouter.post("/:id/leads", requireRole("admin"), validate(addLeadsToCampaignSchema), campaignsController.addLeads);
campaignsRouter.delete("/:id/leads", requireRole("admin"), validate(removeLeadsFromCampaignSchema), campaignsController.removeLeads);
campaignsRouter.get("/:id/status", requireRole("user"), campaignsController.status);
campaignsRouter.post("/:id/generate-emails", requireRole("admin"), campaignsController.generateEmails);
campaignsRouter.post("/:id/submit", requireRole("admin"), campaignsController.submitAll);
campaignsRouter.post("/:id/launch", requireRole("admin"), validate(launchCampaignSchema), campaignsController.launch);
