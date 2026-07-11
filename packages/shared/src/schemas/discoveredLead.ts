import { z } from "zod";
import { DiscoveredLeadStatus } from "../enums/index.js";
import { paginationQuerySchema } from "./common.js";

export const discoveredLeadListQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(DiscoveredLeadStatus).optional(),
});
export type DiscoveredLeadListQuery = z.infer<typeof discoveredLeadListQuerySchema>;

export const promoteDiscoveredLeadsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});
export type PromoteDiscoveredLeadsInput = z.infer<typeof promoteDiscoveredLeadsSchema>;

const discoveredPersonSchema = z.object({
  apolloId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  title: z.string().nullish(),
  linkedinUrl: z.string().nullish(),
  organizationApolloId: z.string(),
  hasEmail: z.boolean().optional(),
});

export type DiscoveredPersonPayload = z.infer<typeof discoveredPersonSchema>;
