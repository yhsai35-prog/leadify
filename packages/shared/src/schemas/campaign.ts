import { z } from "zod";
import { CampaignStatus } from "../enums/index.js";
import { uuidSchema } from "./common.js";

export const createCampaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  scheduledAt: z.string().datetime().optional(),
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
