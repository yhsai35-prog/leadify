import { organizationsRepository } from "../../repositories/organizationsRepository.js";

export interface OrgIdentity {
  /** Tenant company name, injected into AI prompts in place of a hardcoded brand. */
  name: string;
  /** One-paragraph description of what the tenant sells (organizations.company_profile). */
  profile: string;
}

const FALLBACK: OrgIdentity = {
  name: "the company",
  profile: "a B2B company running AI-assisted sales outreach",
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { identity: OrgIdentity; expiresAt: number }>();

/**
 * Resolves the tenant identity used to parametrize every Claude prompt.
 * Cached briefly since qualification/outreach flows call this on every AI
 * request and org branding changes are rare.
 */
export async function getOrgIdentity(organizationId: string): Promise<OrgIdentity> {
  const cached = cache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) return cached.identity;

  const org = await organizationsRepository.findById(organizationId);
  const identity: OrgIdentity = org
    ? {
        name: org.name,
        profile: org.companyProfile?.trim() || `${org.name} is a B2B company running AI-assisted sales outreach`,
      }
    : FALLBACK;

  cache.set(organizationId, { identity, expiresAt: Date.now() + CACHE_TTL_MS });
  return identity;
}
