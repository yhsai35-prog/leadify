import { z } from "zod";

export const acknowledgeOutreachSchema = z.object({
  channel: z.enum(["email", "linkedin", "whatsapp"]),
  acknowledged: z.boolean(),
});
export type AcknowledgeOutreachInput = z.infer<typeof acknowledgeOutreachSchema>;

export const nurturingListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
});
export type NurturingListQuery = z.infer<typeof nurturingListQuerySchema>;

export const aiUsageQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type AiUsageQuery = z.infer<typeof aiUsageQuerySchema>;
