import crypto from "node:crypto";
import { TARGET_DECISION_MAKER_TITLES, apolloKeywordTagsForIndustries, industryMatchesIcpSelection } from "@bluwheelz/shared";
import type { ApolloSearchInput } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/errors.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";

/** Context threaded through Apollo calls purely so usage can be counted per-org/user. */
export interface AiUsageContext {
  organizationId: string;
  userId?: string | null;
}

function recordUsage(context: AiUsageContext | undefined, action: string): void {
  if (!context) return;
  try {
    aiUsageRepository.record(context.organizationId, context.userId, "apollo", action);
  } catch (err) {
    logger.warn({ err, action }, "Failed to record Apollo AI usage event");
  }
}

export interface ApolloOrganization {
  apolloId: string;
  name: string;
  domain: string | null;
  industry: string | null;
  employeeCount: number | null;
  estimatedRevenueInrCr: number | null;
  city: string | null;
}

export interface ApolloPerson {
  apolloId: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  linkedinUrl: string | null;
  organizationApolloId: string;
  hasEmail?: boolean;
}

const MAX_POCS_PER_ORG = 3;

export interface ApolloSearchOptions {
  /** Skip organizations/enrich per domain (saves Apollo credits on staging search). */
  skipDomainEnrich?: boolean;
  /** Skip per-org people/match calls; use only global people search results. */
  skipPerOrgPeopleFetch?: boolean;
  /** Reveal verified emails for matched POCs (uses Apollo credits). */
  revealEmails?: boolean;
  /** Only fetch company list — skip people search and enrichment (fast pagination pass). */
  companiesOnly?: boolean;
  /** Org/user context for AI credit usage tracking (Super Admin AI Usage screen). */
  context?: AiUsageContext;
}

export interface ApolloSearchResponse {
  organizations: ApolloOrganization[];
  people: ApolloPerson[];
  totalResults: number;
}

const APOLLO_API_ROOT = env.APOLLO_BASE_URL.replace(/\/v1\/?$/, "");

export function hashApolloQuery(input: ApolloSearchInput): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function apolloHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Api-Key": env.APOLLO_API_KEY,
  };
}

function normalizeOrgName(name: string): string {
  return name.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
}

function orgNamesMatch(a: string, b: string): boolean {
  const left = normalizeOrgName(a);
  const right = normalizeOrgName(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function mapOrganization(org: Record<string, unknown>): ApolloOrganization {
  const revenue = (org.organization_revenue as number) ?? (org.annual_revenue as number);
  return {
    apolloId: org.id as string,
    name: org.name as string,
    domain: (org.primary_domain as string) ?? null,
    industry: (org.industry as string) ?? null,
    employeeCount: (org.estimated_num_employees as number) ?? null,
    estimatedRevenueInrCr: revenue ? Math.round(revenue / 1_00_00_000) : null,
    city: (org.city as string) ?? null,
  };
}

function applySearchDisplayDefaults(org: ApolloOrganization, input: ApolloSearchInput): ApolloOrganization {
  return {
    ...org,
    industry: org.industry ?? input.industries[0] ?? null,
  };
}

function mergeOrganization(base: ApolloOrganization, enriched: Partial<ApolloOrganization>): ApolloOrganization {
  return {
    ...base,
    domain: base.domain ?? enriched.domain ?? null,
    industry: base.industry ?? enriched.industry ?? null,
    employeeCount: base.employeeCount ?? enriched.employeeCount ?? null,
    estimatedRevenueInrCr: base.estimatedRevenueInrCr ?? enriched.estimatedRevenueInrCr ?? null,
    city: base.city ?? enriched.city ?? null,
  };
}

function extractPhone(person: Record<string, unknown>): string | null {
  const phones = person.phone_numbers as Array<{ sanitized_number?: string; raw_number?: string }> | undefined;
  if (phones?.length) {
    return phones[0]?.sanitized_number ?? phones[0]?.raw_number ?? null;
  }
  return (person.sanitized_phone as string) ?? null;
}

function mapPerson(person: Record<string, unknown>, organizationApolloId: string): ApolloPerson {
  const lastName = (person.last_name as string) ?? (person.last_name_obfuscated as string) ?? null;
  return {
    apolloId: person.id as string,
    firstName: (person.first_name as string) ?? "Unknown",
    lastName,
    email: (person.email as string) ?? null,
    phone: extractPhone(person),
    title: (person.title as string) ?? null,
    linkedinUrl: (person.linkedin_url as string) ?? null,
    organizationApolloId,
    hasEmail: person.has_email === true,
  };
}

async function enrichByDomain(
  domain: string,
  context?: AiUsageContext,
): Promise<Partial<ApolloOrganization> & { companyPhone?: string | null }> {
  recordUsage(context, "domain_enrich");
  try {
    const response = await fetch(`${APOLLO_API_ROOT}/v1/organizations/enrich`, {
      method: "POST",
      headers: apolloHeaders(),
      body: JSON.stringify({ domain }),
    });
    if (!response.ok) return {};
    const body = (await response.json()) as { organization?: Record<string, unknown> };
    if (!body.organization) return {};
    const org = body.organization;
    const primaryPhone = org.primary_phone as { sanitized_number?: string; number?: string } | undefined;
    return {
      ...mapOrganization(org),
      companyPhone: primaryPhone?.sanitized_number ?? primaryPhone?.number ?? (org.phone as string) ?? null,
    };
  } catch {
    return {};
  }
}

/** Reveals firmographics + company switchboard phone for a domain. */
export async function enrichOrganizationByDomain(
  domain: string,
  context?: AiUsageContext,
): Promise<Partial<ApolloOrganization> & { companyPhone?: string | null }> {
  return enrichByDomain(domain, context);
}

/** Reveals verified work email via Apollo credits (people/match). Works on Basic plan. */
export async function enrichPersonById(apolloId: string, context?: AiUsageContext): Promise<Partial<ApolloPerson>> {
  recordUsage(context, "people_match");
  try {
    const response = await fetch(`${APOLLO_API_ROOT}/v1/people/match`, {
      method: "POST",
      headers: apolloHeaders(),
      body: JSON.stringify({ id: apolloId, reveal_personal_emails: true }),
    });
    if (!response.ok) return {};
    const body = (await response.json()) as { person?: Record<string, unknown> };
    const person = body.person;
    if (!person?.id) return {};

    return {
      firstName: (person.first_name as string) ?? undefined,
      lastName: (person.last_name as string) ?? undefined,
      email: (person.email as string) ?? null,
      phone: extractPhone(person),
      title: (person.title as string) ?? undefined,
      linkedinUrl: (person.linkedin_url as string) ?? undefined,
      hasEmail: Boolean(person.email),
    };
  } catch {
    return {};
  }
}

/** Finds decision-maker POCs for a specific company by name. */
export async function fetchPeopleForOrganization(
  orgName: string,
  titles: string[],
  limit = MAX_POCS_PER_ORG,
  context?: AiUsageContext,
): Promise<Array<Record<string, unknown>>> {
  recordUsage(context, "people_search");
  const response = await fetch(`${APOLLO_API_ROOT}/api/v1/mixed_people/api_search`, {
    method: "POST",
    headers: apolloHeaders(),
    body: JSON.stringify({
      q_organization_keyword_tags: [orgName],
      person_titles: titles,
      page: 1,
      per_page: limit,
    }),
  });

  if (!response.ok) return [];
  const body = (await response.json()) as { people?: Array<Record<string, unknown>> };
  return body.people ?? [];
}

async function fetchDecisionMakers(
  input: ApolloSearchInput,
  titles: string[],
  context?: AiUsageContext,
): Promise<Array<Record<string, unknown>>> {
  recordUsage(context, "people_search");
  const response = await fetch(`${APOLLO_API_ROOT}/api/v1/mixed_people/api_search`, {
    method: "POST",
    headers: apolloHeaders(),
    body: JSON.stringify({
      q_organization_keyword_tags: apolloKeywordTagsForIndustries(input.industries),
      person_locations: input.locations,
      person_titles: titles,
      page: input.page,
      per_page: input.perPage,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.warn({ status: response.status, body }, "Apollo people search unavailable; continuing with companies only");
    return [];
  }

  const body = (await response.json()) as { people?: Array<Record<string, unknown>> };
  return body.people ?? [];
}

function matchPeopleToOrganizations(
  organizations: ApolloOrganization[],
  rawPeople: Array<Record<string, unknown>>,
): ApolloPerson[] {
  const people: ApolloPerson[] = [];
  const seen = new Set<string>();

  for (const raw of rawPeople) {
    const orgName = ((raw.organization as Record<string, unknown> | undefined)?.name as string) ?? "";
    const matchedOrg = organizations.find((org) => orgNamesMatch(org.name, orgName));
    if (!matchedOrg) continue;

    const key = `${matchedOrg.apolloId}:${String(raw.id)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    people.push(mapPerson(raw, matchedOrg.apolloId));
  }

  return people;
}

async function resolvePeopleForOrganizations(
  organizations: ApolloOrganization[],
  globalRawPeople: Array<Record<string, unknown>>,
  titles: string[],
  skipPerOrgFetch = false,
  context?: AiUsageContext,
  revealEmails = false,
): Promise<ApolloPerson[]> {
  const byOrg = new Map<string, Map<string, ApolloPerson>>();

  for (const person of matchPeopleToOrganizations(organizations, globalRawPeople)) {
    const bucket = byOrg.get(person.organizationApolloId) ?? new Map();
    bucket.set(person.apolloId, person);
    byOrg.set(person.organizationApolloId, bucket);
  }

  if (!skipPerOrgFetch) {
    await Promise.all(
      organizations.map(async (org) => {
        const bucket = byOrg.get(org.apolloId) ?? new Map();
        if (bucket.size >= MAX_POCS_PER_ORG) return;

        const orgPeople = await fetchPeopleForOrganization(org.name, titles, MAX_POCS_PER_ORG, context);
        for (const raw of orgPeople) {
          if (bucket.size >= MAX_POCS_PER_ORG) break;
          const apolloId = String(raw.id);
          if (bucket.has(apolloId)) continue;
          bucket.set(apolloId, mapPerson(raw, org.apolloId));
        }
        byOrg.set(org.apolloId, bucket);
      }),
    );
  }

  let people = Array.from(byOrg.values()).flatMap((bucket) => Array.from(bucket.values()));

  if (revealEmails) {
    // Avoid exploding credit usage: cap total reveal attempts per search.
    const MAX_REVEALS_PER_SEARCH = 30;
    const candidates = people
      .filter((p) => p.hasEmail && !p.email)
      .slice(0, MAX_REVEALS_PER_SEARCH);

    if (candidates.length > 0) {
      const enriched = await Promise.all(
        candidates.map(async (p) => {
          const details = await enrichPersonById(p.apolloId, context);
          return { ...p, email: details.email ?? p.email, hasEmail: Boolean(details.email ?? p.email) };
        }),
      );
      const enrichedById = new Map(enriched.map((p) => [p.apolloId, p]));
      people = people.map((p) => enrichedById.get(p.apolloId) ?? p);
    }
  }

  return people;
}

/**
 * Company discovery via Apollo mixed_companies/search, enriched with
 * organizations/enrich for firmographics and mixed_people/api_search for
 * decision-maker POCs (the mixed_companies endpoint alone returns names only).
 */
export const apolloClient = {
  async searchOrganizations(input: ApolloSearchInput, options?: ApolloSearchOptions): Promise<ApolloSearchResponse> {
    const titles = input.titles?.length ? input.titles : [...TARGET_DECISION_MAKER_TITLES];
    const keywordTags = apolloKeywordTagsForIndustries(input.industries);
    const fetchCount = input.perPage;
    const skipDomainEnrich = options?.skipDomainEnrich ?? false;
    const skipPerOrgPeopleFetch = options?.skipPerOrgPeopleFetch ?? false;
    const revealEmails = options?.revealEmails ?? false;
    const companiesOnly = options?.companiesOnly ?? false;
    const context = options?.context;
    recordUsage(context, "company_search");

    const companyResponse = await fetch(`${env.APOLLO_BASE_URL}/mixed_companies/search`, {
      method: "POST",
      headers: apolloHeaders(),
      body: JSON.stringify({
        q_organization_keyword_tags: keywordTags,
        organization_locations: input.locations,
        person_titles: titles,
        page: input.page,
        per_page: fetchCount,
      }),
    });

    if (!companyResponse.ok) {
      const body = await companyResponse.text();
      logger.error({ status: companyResponse.status, body }, "Apollo search failed");
      throw ApiError.internal("Apollo search is unavailable right now. Try again shortly.");
    }

    const body = (await companyResponse.json()) as {
      organizations?: Array<Record<string, unknown>>;
      pagination?: { total_entries?: number };
    };

    let organizations = (body.organizations ?? []).map((org) => mapOrganization(org));
    const totalResults = body.pagination?.total_entries ?? 0;

    if (companiesOnly) {
      return { organizations, people: [], totalResults };
    }

    const rawPeople = await fetchDecisionMakers(input, titles, context);

    if (!skipDomainEnrich) {
      organizations = await Promise.all(
        organizations.map(async (org) => {
          if (!org.domain) return org;
          const enriched = await enrichByDomain(org.domain, context);
          const { companyPhone: _phone, ...orgFields } = enriched;
          return mergeOrganization(org, orgFields);
        }),
      );
    }

    // Staging search skips domain enrich, so industry is often null on raw Apollo rows.
    // Keyword tags already scope ICP; only post-filter when enrich supplied industry.
    organizations = organizations
      .filter(
        (org) => skipDomainEnrich || !org.industry || industryMatchesIcpSelection(org.industry, input.industries),
      )
      .slice(0, input.perPage)
      .map((org) => applySearchDisplayDefaults(org, input));

    const people = await resolvePeopleForOrganizations(
      organizations,
      rawPeople,
      titles,
      skipPerOrgPeopleFetch,
      context,
      revealEmails,
    );

    return {
      organizations,
      people,
      totalResults,
    };
  },

  /** Enrich a pre-fetched company list with firmographics and decision-maker POCs (no email reveal). */
  async enrichDiscoveryResults(
    organizations: ApolloOrganization[],
    input: ApolloSearchInput,
    context?: AiUsageContext,
  ): Promise<ApolloSearchResponse> {
    if (organizations.length === 0) {
      return { organizations: [], people: [], totalResults: 0 };
    }

    const titles = input.titles?.length ? input.titles : [...TARGET_DECISION_MAKER_TITLES];
    const enrichedOrgs = await Promise.all(
      organizations.map(async (org) => {
        if (!org.domain) return org;
        const enriched = await enrichByDomain(org.domain, context);
        const { companyPhone: _phone, ...orgFields } = enriched;
        return mergeOrganization(org, orgFields);
      }),
    );

    const filtered = enrichedOrgs
      .filter((org) => !org.industry || industryMatchesIcpSelection(org.industry, input.industries))
      .map((org) => applySearchDisplayDefaults(org, input));

    const rawPeople = await fetchDecisionMakers(input, titles, context);
    const people = await resolvePeopleForOrganizations(
      filtered,
      rawPeople,
      titles,
      false,
      context,
      false,
    );

    return { organizations: filtered, people, totalResults: filtered.length };
  },
};
