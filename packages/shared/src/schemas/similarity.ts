import { z } from "zod";

export const similarityProspectsQuerySchema = z.object({
  clientName: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});
export type SimilarityProspectsQuery = z.infer<typeof similarityProspectsQuerySchema>;

export const existingClientProfileParamSchema = z.object({
  companyId: z.string().uuid(),
});
