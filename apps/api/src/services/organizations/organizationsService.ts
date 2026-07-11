import type { Organization, UpdateOrganizationSettingsInput } from "@bluwheelz/shared";
import { organizationsRepository } from "../../repositories/organizationsRepository.js";
import { ApiError } from "../../utils/errors.js";

export const organizationsService = {
  async getCurrent(organizationId: string): Promise<Organization> {
    const org = await organizationsRepository.findById(organizationId);
    if (!org) throw ApiError.notFound("Organization not found");
    return org;
  },

  /** Shallow-merges `icpWeights` into existing settings so a partial PATCH never wipes unrelated keys. */
  async updateCurrent(organizationId: string, input: UpdateOrganizationSettingsInput): Promise<Organization> {
    const existing = await this.getCurrent(organizationId);
    const nextSettings = {
      ...existing.settings,
      ...(input.icpWeights
        ? { icpWeights: { ...(existing.settings.icpWeights ?? {}), ...input.icpWeights } }
        : {}),
    };

    return organizationsRepository.updateSettings(organizationId, {
      name: input.name,
      settings: nextSettings,
      companyProfile: input.companyProfile,
    });
  },
};
