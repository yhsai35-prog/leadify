import type { NurturingLead } from "@bluwheelz/shared";
import { nurturingRepository } from "../../repositories/nurturingRepository.js";

export const nurturingService = {
  async list(organizationId: string, userId?: string): Promise<NurturingLead[]> {
    return nurturingRepository.list(organizationId, userId);
  },
};
