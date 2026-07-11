import { Router } from "express";
import { createKnowledgeBaseArticleSchema, updateKnowledgeBaseArticleSchema } from "@bluwheelz/shared";
import { knowledgeBaseController } from "../controllers/knowledgeBaseController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(requireAuth);

// Read access for all authenticated users
knowledgeBaseRouter.get("/", knowledgeBaseController.list);
knowledgeBaseRouter.get("/:id", knowledgeBaseController.getOne);

// Write access for admin and above
knowledgeBaseRouter.post("/", requireRole("admin"), validate(createKnowledgeBaseArticleSchema), knowledgeBaseController.create);
knowledgeBaseRouter.patch("/:id", requireRole("admin"), validate(updateKnowledgeBaseArticleSchema), knowledgeBaseController.update);
knowledgeBaseRouter.post("/:id/publish-update", requireRole("admin"), knowledgeBaseController.publishUpdate);
knowledgeBaseRouter.delete("/:id", requireRole("admin"), knowledgeBaseController.remove);
