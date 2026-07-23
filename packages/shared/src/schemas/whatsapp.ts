import { z } from "zod";

export const whatsappTemplateSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  metaId: z.string().nullable().optional(),
  name: z.string(),
  language: z.string(),
  status: z.string(),
  category: z.string().nullable().optional(),
  components: z.array(z.unknown()).default([]),
  syncedAt: z.string(),
});
export type WhatsappTemplateDto = z.infer<typeof whatsappTemplateSchema>;

export const whatsappGenerationResultSchema = z.object({
  bodyVariables: z.array(z.string()),
  bodyPreview: z.string().min(1),
});
export type WhatsappGenerationResult = z.infer<typeof whatsappGenerationResultSchema>;

export const generateWhatsappMessageSchema = z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid(),
  templateName: z.string().min(1),
  templateLanguage: z.string().min(1).default("en"),
  tone: z.enum(["professional", "casual", "direct"]).default("professional"),
  campaignId: z.string().uuid().optional(),
});
export type GenerateWhatsappMessageInput = z.infer<typeof generateWhatsappMessageSchema>;

export const syncWhatsappTemplatesSchema = z.object({}).optional();
