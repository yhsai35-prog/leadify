import { Router } from "express";
import multer from "multer";
import { createKnowledgeBaseArticleSchema, updateKnowledgeBaseArticleSchema, uploadKnowledgeBaseArticleSchema } from "@bluwheelz/shared";
import { knowledgeBaseController } from "../controllers/knowledgeBaseController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { knowledgeBaseFileService } from "../services/knowledgeBase/knowledgeBaseFileService.js";
import { SUPPORTED_KB_FILE_MIME_TYPES } from "../services/knowledgeBase/knowledgeBaseExtractionService.js";
import { ApiError } from "../utils/errors.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: knowledgeBaseFileService.maxFileSizeBytes },
  fileFilter: (_req, file, callback) => {
    if (!SUPPORTED_KB_FILE_MIME_TYPES.includes(file.mimetype as (typeof SUPPORTED_KB_FILE_MIME_TYPES)[number])) {
      callback(ApiError.badRequest("Only PDF and DOCX files are supported."));
      return;
    }
    callback(null, true);
  },
});

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(requireAuth);

// Read access for all authenticated users
knowledgeBaseRouter.get("/", knowledgeBaseController.list);
knowledgeBaseRouter.get("/:id", knowledgeBaseController.getOne);

// Write access for admin and above
knowledgeBaseRouter.post("/", requireRole("admin"), validate(createKnowledgeBaseArticleSchema), knowledgeBaseController.create);
knowledgeBaseRouter.post(
  "/upload",
  requireRole("admin"),
  upload.single("file"),
  validate(uploadKnowledgeBaseArticleSchema),
  knowledgeBaseController.upload,
);
knowledgeBaseRouter.patch("/:id", requireRole("admin"), validate(updateKnowledgeBaseArticleSchema), knowledgeBaseController.update);
knowledgeBaseRouter.post("/:id/publish-update", requireRole("admin"), knowledgeBaseController.publishUpdate);
knowledgeBaseRouter.delete("/:id", requireRole("admin"), knowledgeBaseController.remove);
