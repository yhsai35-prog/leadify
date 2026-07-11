import { z } from "zod";

export const analyticsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const actionQueueQuerySchema = analyticsQuerySchema.extend({
  limit: z.coerce.number().int().min(1).max(20).optional().default(10),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
