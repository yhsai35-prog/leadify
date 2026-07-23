import { z } from "zod";
import { CampaignChannel, CampaignStatus } from "../enums/index.js";
import { uuidSchema } from "./common.js";
import { campaignFlowDefinitionSchema } from "./campaignFlow.js";

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  channel: z.nativeEnum(CampaignChannel).default(CampaignChannel.EMAIL),
  flowDefinition: campaignFlowDefinitionSchema.optional(),
  useRecommendedFlow: z.boolean().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  scheduledAt: z.string().datetime().optional(),
  channel: z.nativeEnum(CampaignChannel).optional(),
  flowDefinition: campaignFlowDefinitionSchema.optional(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

export const addLeadsToCampaignSchema = z.object({
  leadIds: z.array(uuidSchema).min(1),
});
export type AddLeadsToCampaignInput = z.infer<typeof addLeadsToCampaignSchema>;

export const campaignIdParamSchema = z.object({ id: uuidSchema });

export const removeLeadsFromCampaignSchema = z.object({
  leadIds: z.array(uuidSchema).min(1),
});
export type RemoveLeadsFromCampaignInput = z.infer<typeof removeLeadsFromCampaignSchema>;

export const launchCampaignSchema = z.object({
  scheduledAt: z.string().datetime().optional(),
});
export type LaunchCampaignInput = z.infer<typeof launchCampaignSchema>;

export const generateCampaignOutreachSchema = z.object({
  /** When set, only generate for these contact IDs (must be campaign recipients / lead contacts). */
  contactIds: z.array(uuidSchema).optional(),
});
export type GenerateCampaignOutreachInput = z.infer<typeof generateCampaignOutreachSchema>;

export const setCampaignRecipientsSchema = z.object({
  recipients: z
    .array(
      z.object({
        leadId: uuidSchema,
        contactId: uuidSchema,
        selected: z.boolean().default(true),
      }),
    )
    .min(1),
});
export type SetCampaignRecipientsInput = z.infer<typeof setCampaignRecipientsSchema>;

export const updateCampaignRecipientSchema = z.object({
  selected: z.boolean(),
});
export type UpdateCampaignRecipientInput = z.infer<typeof updateCampaignRecipientSchema>;

/** Manually add a phone (or email) for campaign testing without importing a lead from Apollo. */
export const addManualCampaignRecipientSchema = z.object({
  phone: z.string().min(8).max(32).optional(),
  email: z.string().email().optional(),
  label: z.string().min(1).max(80).optional(),
}).refine((v) => Boolean(v.phone || v.email), {
  message: "Provide a phone number or email",
});
export type AddManualCampaignRecipientInput = z.infer<typeof addManualCampaignRecipientSchema>;
