import { z } from "zod";
import { Priority } from "../enums/index.js";

/**
 * Structured output contract enforced on the Claude qualification tool call.
 * Kept in shared/ so both the prompt builder (API) and the score breakdown
 * UI (web) render/validate the exact same shape.
 */
export const scoreBreakdownSchema = z.object({
  industry: z.number().min(0).max(30),
  size: z.number().min(0).max(25),
  operations: z.number().min(0).max(25),
  growth: z.number().min(0).max(10),
  similarity: z.number().min(0).max(10),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const industryAnalysisSchema = z.object({
  vertical: z.string(),
  fitSignals: z.array(z.string()),
  gaps: z.array(z.string()),
});
export type IndustryAnalysis = z.infer<typeof industryAnalysisSchema>;

export const qualificationResultSchema = z.object({
  icpScore: z.number().min(0).max(100),
  priority: z.nativeEnum(Priority),
  reasoning: z.string(),
  painPoints: z.array(z.string()),
  industryAnalysis: industryAnalysisSchema,
  scoreBreakdown: scoreBreakdownSchema,
});
export type QualificationResult = z.infer<typeof qualificationResultSchema>;
