import type { AiUsageByUserRow, AiUsageSummaryRow } from "@bluwheelz/shared";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";

export const aiUsageService = {
  async summary(organizationId: string, from?: string, to?: string): Promise<AiUsageSummaryRow[]> {
    return aiUsageRepository.summary(organizationId, from, to);
  },

  async byUser(organizationId: string, from?: string, to?: string): Promise<AiUsageByUserRow[]> {
    return aiUsageRepository.byUser(organizationId, from, to);
  },
};
