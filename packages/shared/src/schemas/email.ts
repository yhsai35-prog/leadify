import { z } from "zod";
import { EmailType } from "../enums/index.js";
import { uuidSchema } from "./common.js";

export const generateEmailSchema = z.object({
  contactId: uuidSchema,
  type: z.nativeEnum(EmailType).default(EmailType.INITIAL),
  tone: z.enum(["professional", "casual", "direct"]).default("professional"),
});
export type GenerateEmailInput = z.infer<typeof generateEmailSchema>;

/** Structured output contract enforced on the Claude outreach generation tool call. */
export const outreachGenerationResultSchema = z.object({
  subject: z.string(),
  emailBodyHtml: z.string(),
  emailBodyText: z.string(),
  linkedinMessage: z.string(),
  followUpEmail: z.string(),
  callScript: z.string(),
});
export type OutreachGenerationResult = z.infer<typeof outreachGenerationResultSchema>;

export const updateEmailSchema = z.object({
  subject: z.string().min(1).optional(),
  bodyHtml: z.string().min(1).optional(),
  bodyText: z.string().min(1).optional(),
  linkedinMessage: z.string().optional(),
  callScript: z.string().optional(),
});
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;

export const scheduleEmailSchema = z.object({
  scheduledAt: z.string().datetime(),
});
export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;

export const emailIdParamSchema = z.object({ id: uuidSchema });
