import { Router } from "express";
import {
  acknowledgeOutreachSchema,
  assignLeadSchema,
  generateEmailSchema,
  leadIdParamSchema,
  leadListQuerySchema,
  updateLeadStatusSchema,
} from "@bluwheelz/shared";
import { pipelineController } from "../controllers/pipelineController.js";
import { qualificationController } from "../controllers/qualificationController.js";
import { similarityController } from "../controllers/similarityController.js";
import { outreachController } from "../controllers/outreachController.js";
import { meetingsController } from "../controllers/meetingsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { aiRateLimit } from "../middleware/rateLimit.js";

export const leadsRouter = Router();
leadsRouter.use(requireAuth);

// Static paths must be registered before the "/:id" param-validation
// middleware below, otherwise Express would treat "board" as a lead ID.
leadsRouter.get("/", requireRole("user"), validate(leadListQuerySchema, "query"), pipelineController.list);
leadsRouter.get("/board", requireRole("user"), pipelineController.board);

leadsRouter.use("/:id", validate(leadIdParamSchema, "params"));
leadsRouter.get("/:id", requireRole("user"), pipelineController.detail);
leadsRouter.patch("/:id/status", requireRole("user"), validate(updateLeadStatusSchema), pipelineController.updateStatus);
leadsRouter.patch("/:id/assign", requireRole("admin"), validate(assignLeadSchema), pipelineController.assign);
leadsRouter.get("/:id/activities", requireRole("user"), pipelineController.activities);
leadsRouter.post("/:id/reveal-contacts", requireRole("user"), pipelineController.revealContacts);
leadsRouter.get("/:id/acknowledgements", requireRole("user"), pipelineController.listAcknowledgements);
leadsRouter.put(
  "/:id/contacts/:contactId/acknowledge",
  requireRole("user"),
  validate(acknowledgeOutreachSchema),
  pipelineController.acknowledgeOutreach,
);

// Qualification (Module 2)
leadsRouter.post("/:id/qualify", requireRole("user"), aiRateLimit, qualificationController.qualify);
leadsRouter.get("/:id/scores", requireRole("user"), qualificationController.history);
leadsRouter.get("/:id/scores/latest", requireRole("user"), qualificationController.latest);

// Existing Client Similarity (Module 4)
leadsRouter.get("/:id/similarity", requireRole("user"), similarityController.getMatches);
leadsRouter.post("/:id/similarity/compute", requireRole("user"), aiRateLimit, similarityController.recompute);

// Email Generator (Module 5)
leadsRouter.post("/:id/emails/generate", requireRole("user"), aiRateLimit, validate(generateEmailSchema), outreachController.generate);
leadsRouter.get("/:id/emails", requireRole("user"), outreachController.list);

// Meetings (part of Pipeline module)
leadsRouter.get("/:id/meetings", requireRole("user"), meetingsController.listForLead);
leadsRouter.post("/:id/meetings", requireRole("user"), meetingsController.create);
