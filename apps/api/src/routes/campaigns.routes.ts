import { Router } from "express";
import {
  addLeadsToCampaignSchema,
  addManualCampaignRecipientSchema,
  campaignIdParamSchema,
  createCampaignSchema,
  generateCampaignOutreachSchema,
  launchCampaignSchema,
  removeLeadsFromCampaignSchema,
  setCampaignRecipientsSchema,
  updateCampaignRecipientSchema,
  updateCampaignSchema,
} from "@bluwheelz/shared";
import { campaignsController } from "../controllers/campaignsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { z } from "zod";

export const campaignsRouter = Router();
campaignsRouter.use(requireAuth);
campaignsRouter.use(
  "/:id",
  validate(z.object({ id: z.string().uuid() }).passthrough(), "params"),
);

campaignsRouter.get("/", requireRole("user"), campaignsController.list);
campaignsRouter.post("/", requireRole("admin"), validate(createCampaignSchema), campaignsController.create);
campaignsRouter.get("/:id", requireRole("user"), campaignsController.detail);
campaignsRouter.patch("/:id", requireRole("admin"), validate(updateCampaignSchema), campaignsController.update);
campaignsRouter.post("/:id/leads", requireRole("admin"), validate(addLeadsToCampaignSchema), campaignsController.addLeads);
campaignsRouter.delete("/:id/leads", requireRole("admin"), validate(removeLeadsFromCampaignSchema), campaignsController.removeLeads);
campaignsRouter.get("/:id/status", requireRole("user"), campaignsController.status);
campaignsRouter.post(
  "/:id/generate-emails",
  requireRole("admin"),
  validate(generateCampaignOutreachSchema),
  campaignsController.generateEmails,
);
campaignsRouter.post("/:id/submit", requireRole("admin"), campaignsController.submitAll);
campaignsRouter.post("/:id/launch", requireRole("admin"), validate(launchCampaignSchema), campaignsController.launch);
campaignsRouter.put(
  "/:id/recipients",
  requireRole("admin"),
  validate(setCampaignRecipientsSchema),
  campaignsController.setRecipients,
);
campaignsRouter.post(
  "/:id/recipients/manual",
  requireRole("admin"),
  validate(addManualCampaignRecipientSchema),
  campaignsController.addManualRecipient,
);
campaignsRouter.patch(
  "/:id/recipients/:contactId",
  requireRole("admin"),
  validate(z.object({ id: z.string().uuid(), contactId: z.string().uuid() }), "params"),
  validate(updateCampaignRecipientSchema),
  campaignsController.updateRecipient,
);
campaignsRouter.get("/:id/conversation", requireRole("user"), campaignsController.conversationHistory);
