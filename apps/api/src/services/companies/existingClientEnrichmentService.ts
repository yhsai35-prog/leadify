import type { Company } from "@bluwheelz/shared";
import { getExistingClientSeed } from "@bluwheelz/shared";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { enrichOrganizationByDomain } from "../apollo/apolloClient.js";
import { logger } from "../../config/logger.js";

function needsFirmographicBackfill(company: Company): boolean {
  if (!company.isExistingClient) return false;
  const metadata = company.metadata as { city?: string } | undefined;
  return (
    !company.domain ||
    company.employeeCount == null ||
    company.citiesCount == null ||
    !metadata?.city
  );
}

/**
 * Backfills missing firmographics for seeded existing clients using the
 * shared seed catalog and, when available, Apollo domain enrichment.
 */
export async function ensureExistingClientFirmographics(company: Company): Promise<Company> {
  if (!needsFirmographicBackfill(company)) return company;

  const seed = getExistingClientSeed(company.name);
  if (!seed) return company;

  const patch: Partial<Company> = {};
  const metadata = { ...(company.metadata as Record<string, unknown>) };

  if (!company.domain) {
    const domainOwner = await companiesRepository.findByDomain(company.organizationId, seed.domain);
    if (!domainOwner || domainOwner.id === company.id) {
      patch.domain = seed.domain;
    }
  }
  if (company.employeeCount == null) patch.employeeCount = seed.employeeCount;
  if (company.citiesCount == null) patch.citiesCount = seed.citiesCount;
  if (!metadata.city) metadata.city = seed.headquartersCity;

  const domain = company.domain ?? patch.domain ?? seed.domain;
  if (domain) {
    try {
      const apollo = await enrichOrganizationByDomain(domain, {
        organizationId: company.organizationId,
      });

      if (apollo.employeeCount != null && company.employeeCount == null) {
        patch.employeeCount = apollo.employeeCount;
      }
      if (apollo.industry && !company.industry) patch.industry = apollo.industry;
      if (apollo.apolloId && !company.apolloId) {
        const apolloOwner = await companiesRepository.findByApolloId(company.organizationId, apollo.apolloId);
        if (!apolloOwner || apolloOwner.id === company.id) {
          patch.apolloId = apollo.apolloId;
        }
      }
      if (apollo.estimatedRevenueInrCr != null && company.revenueInrCr == null) {
        patch.revenueInrCr = apollo.estimatedRevenueInrCr;
      }
      if (apollo.city && !metadata.city) metadata.city = apollo.city;
      if (apollo.companyPhone && !metadata.companyPhone) metadata.companyPhone = apollo.companyPhone;
    } catch (err) {
      logger.warn({ companyId: company.id, domain, err }, "Apollo backfill failed for existing client");
    }
  }

  if (
    Object.keys(patch).length === 0 &&
    metadata.city === (company.metadata as { city?: string } | undefined)?.city
  ) {
    return company;
  }

  patch.metadata = metadata;
  return companiesRepository.update(company.id, patch);
}
