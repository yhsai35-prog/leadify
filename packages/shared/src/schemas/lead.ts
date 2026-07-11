import { z } from "zod";
import { PipelineStatus, Priority } from "../enums/index.js";
import { paginationQuerySchema, uuidSchema } from "./common.js";

export const leadFiltersSchema = z.object({
  pipelineStatus: z.nativeEnum(PipelineStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedTo: uuidSchema.optional(),
  industry: z.string().optional(),
  search: z.string().optional(),
});
export type LeadFilters = z.infer<typeof leadFiltersSchema>;

export const leadListQuerySchema = leadFiltersSchema.merge(paginationQuerySchema);
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export const updateLeadStatusSchema = z.object({
  status: z.nativeEnum(PipelineStatus),
  reason: z.string().optional(),
});
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;

export const assignLeadSchema = z.object({
  assignedTo: uuidSchema,
});
export type AssignLeadInput = z.infer<typeof assignLeadSchema>;

export const leadIdParamSchema = z.object({ id: uuidSchema });
