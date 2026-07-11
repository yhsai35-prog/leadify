import { z } from "zod";

export const newsItemSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  date: z.string().optional(),
});
export type NewsItem = z.infer<typeof newsItemSchema>;

export const companyIntelligenceResultSchema = z.object({
  websiteSummary: z.string(),
  businessModel: z.string(),
  expansionSignals: z.array(z.string()),
  growthIndicators: z.array(z.string()),
  news: z.array(newsItemSchema),
  fleetIndicators: z.array(z.string()),
});
export type CompanyIntelligenceResult = z.infer<typeof companyIntelligenceResultSchema>;

export const similarityResultSchema = z.object({
  mostSimilarClient: z.string(),
  similarityPct: z.number().min(0).max(100),
  reason: z.string(),
});
export type SimilarityResult = z.infer<typeof similarityResultSchema>;
