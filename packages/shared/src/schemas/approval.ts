import { z } from "zod";
import { uuidSchema } from "./common.js";

export const rejectApprovalSchema = z.object({
  reviewerNotes: z.string().min(1, "A rejection reason is required"),
});
export type RejectApprovalInput = z.infer<typeof rejectApprovalSchema>;

export const editAndApproveSchema = z.object({
  editedContent: z.object({
    subject: z.string().optional(),
    bodyHtml: z.string().optional(),
    bodyText: z.string().optional(),
    linkedinMessage: z.string().optional(),
    callScript: z.string().optional(),
  }),
  reviewerNotes: z.string().optional(),
});
export type EditAndApproveInput = z.infer<typeof editAndApproveSchema>;

export const approvalIdParamSchema = z.object({ id: uuidSchema });

export const approvalListQuerySchema = z.object({
  campaignId: uuidSchema.optional(),
});
export type ApprovalListQuery = z.infer<typeof approvalListQuerySchema>;
