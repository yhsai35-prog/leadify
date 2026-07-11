import { Router } from "express";
import { approvalIdParamSchema, approvalListQuerySchema, editAndApproveSchema, rejectApprovalSchema } from "@bluwheelz/shared";
import { approvalController } from "../controllers/approvalController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const approvalQueueRouter = Router();
approvalQueueRouter.use(requireAuth);

approvalQueueRouter.get("/", requireRole("user"), validate(approvalListQuerySchema, "query"), approvalController.listPending);
approvalQueueRouter.get(
  "/ready-to-send",
  requireRole("user"),
  validate(approvalListQuerySchema, "query"),
  approvalController.listReadyToSend,
);

approvalQueueRouter.use("/:id", validate(approvalIdParamSchema, "params"));
approvalQueueRouter.post("/:id/approve", requireRole("user"), approvalController.approve);
approvalQueueRouter.post("/:id/reject", requireRole("user"), validate(rejectApprovalSchema), approvalController.reject);
approvalQueueRouter.post("/:id/edit-approve", requireRole("user"), validate(editAndApproveSchema), approvalController.editAndApprove);
