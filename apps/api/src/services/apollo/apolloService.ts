import type { ApolloImportInput, ApolloSearchInput, Company, Contact, CsvImportRow, Lead } from "@bluwheelz/shared";
import {
  apolloClient,
  enrichOrganizationByDomain,
  enrichPersonById,
  fetchPeopleForOrganization,
  hashApolloQuery,
  type AiUsageContext,
  type ApolloPerson,
  type ApolloSearchResponse,
} from "./apolloClient.js";
import { apolloCacheRepository } from "../../repositories/apolloCacheRepository.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { TARGET_DECISION_MAKER_TITLES } from "@bluwheelz/shared";
import { ApiError } from "../../utils/errors.js";
import { importFailureResponse, mapImportFailure } from "../../utils/friendlyErrors.js";

function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();
}

function isDecisionMakerTitle(title: string | null): boolean {
  if (!title) return false;
  const lower = title.toLowerCase();
  return TARGET_DECISION_MAKER_TITLES.some((t) => lower.includes(t.toLowerCase()));
}

function isObfuscatedName(value: string | null | undefined): boolean {
  return Boolean(value && value.includes("*"));
}

function contactEnrichmentPatch(
  existing: Contact,
  person: ApolloPerson,
): Partial<Contact> | null {
  const patch: Partial<Contact> = {};
  if (!existing.email && person.email) patch.email = person.email;
  if ((!existing.lastName || isObfuscatedName(existing.lastName)) && person.lastName) {
    patch.lastName = person.lastName;
  }
  if (person.firstName && (existing.firstName === "Unknown" || !existing.firstName)) {
    patch.firstName = person.firstName;
  }
  if (!existing.linkedinUrl && person.linkedinUrl) patch.linkedinUrl = person.linkedinUrl;
  if (!existing.title && person.title) patch.title = person.title;

  const metadata = { ...(existing.metadata ?? {}) } as Record<string, unknown>;
  let metadataChanged = false;
  if (person.phone && !existing.phone) {
    patch.phone = person.phone;
  }
  if (person.phone && !metadata.phone) {
    metadata.phone = person.phone;
    metadataChanged = true;
  }
  if ((person.hasEmail ?? person.email) && metadata.apolloHasEmail !== true) {
    metadata.apolloHasEmail = true;
    metadataChanged = true;
  }
  if (metadataChanged) patch.metadata = metadata;

  return Object.keys(patch).length > 0 ? patch : null;
}

async function enrichContactsForImport(
  org: { apolloId: string; name: string },
  people: Array<{
    apolloId: string;
    firstName: string;
    lastName?: string | null;
    email?: string | null;
    phone?: string | null;
    title?: string | null;
    linkedinUrl?: string | null;
    organizationApolloId: string;
  }>,
  options?: { skipEmailReveal?: boolean },
  context?: AiUsageContext,
): Promise<ApolloPerson[]> {
  let candidates = people.filter((p) => p.organizationApolloId === org.apolloId);

  if (candidates.length === 0 || (!options?.skipEmailReveal && candidates.every((p) => !p.email))) {
    const raw = await fetchPeopleForOrganization(org.name, [...TARGET_DECISION_MAKER_TITLES], 3, context);
    if (raw.length > 0) {
      candidates = raw.map((person) => ({
        apolloId: person.id as string,
        firstName: (person.first_name as string) ?? "Unknown",
        lastName: (person.last_name as string) ?? (person.last_name_obfuscated as string) ?? null,
        email: (person.email as string) ?? null,
        phone: null,
        title: (person.title as string) ?? null,
        linkedinUrl: (person.linkedin_url as string) ?? null,
        organizationApolloId: org.apolloId,
      }));
    }
  }

  const enriched: ApolloPerson[] = [];
  for (const person of candidates.slice(0, 3)) {
    if (options?.skipEmailReveal) {
      enriched.push({
        apolloId: person.apolloId,
        firstName: person.firstName,
        lastName: person.lastName ?? null,
        email: person.email ?? null,
        phone: person.phone ?? null,
        title: person.title ?? null,
        linkedinUrl: person.linkedinUrl ?? null,
        organizationApolloId: org.apolloId,
        hasEmail: Boolean(person.email),
      });
      continue;
    }

    const details = await enrichPersonById(person.apolloId, context);
    enriched.push({
      apolloId: person.apolloId,
      firstName: details.firstName ?? person.firstName,
      lastName: details.lastName ?? person.lastName ?? null,
      email: details.email ?? person.email ?? null,
      phone: details.phone ?? person.phone ?? null,
      title: details.title ?? person.title ?? null,
      linkedinUrl: details.linkedinUrl ?? person.linkedinUrl ?? null,
      organizationApolloId: org.apolloId,
      hasEmail: Boolean(details.email ?? person.email),
    });
  }

  return enriched;
}

export const apolloService = {
  async search(input: ApolloSearchInput, context?: AiUsageContext): Promise<ApolloSearchResponse> {
    const queryHash = hashApolloQuery(input);
    const cached = await apolloCacheRepository.get(queryHash);
    if (cached) return cached as ApolloSearchResponse;

    const results = await apolloClient.searchOrganizations(input, {
      // Enrich up to perPage domains so industry/city populate (mixed_companies returns names only).
      skipDomainEnrich: false,
      skipPerOrgPeopleFetch: false,
      revealEmails: true,
      context,
    });
    await apolloCacheRepository.set(queryHash, input, results);
    return results;
  },

  /**
   * Discovery search: bypasses the 6h Apollo cache, skips companies already saved
   * to Leads Found or the pipeline, and paginates through Apollo until up to
   * `perPage` fresh companies are found.
   *
   * Uses a fast companies-only pagination pass, then enriches only the final
   * batch once (no email reveal — emails are revealed on promote).
   */
  async searchForDiscovery(
    input: ApolloSearchInput,
    context: AiUsageContext,
    excludeApolloIds: Iterable<string>,
  ): Promise<ApolloSearchResponse> {
    const excluded = new Set(excludeApolloIds);
    const target = input.perPage;
    const maxPages = 10;
    const candidates: ApolloSearchResponse["organizations"] = [];
    let totalResults = 0;

    for (let page = 1; page <= maxPages && candidates.length < target; page++) {
      const pageResults = await apolloClient.searchOrganizations({ ...input, page }, {
        companiesOnly: true,
        context,
      });
      totalResults = pageResults.totalResults;

      for (const org of pageResults.organizations) {
        if (excluded.has(org.apolloId)) continue;
        excluded.add(org.apolloId);
        candidates.push(org);
        if (candidates.length >= target) break;
      }

      if (pageResults.organizations.length === 0) break;
      if (page * input.perPage >= totalResults) break;
    }

    const enriched = await apolloClient.enrichDiscoveryResults(
      candidates.slice(0, target),
      input,
      context,
    );

    return { ...enriched, totalResults };
  },

  /**
   * Imports selected Apollo organizations (+ their decision-maker contacts)
   * as `companies`/`contacts`/`leads`. Deduplicates on domain and apollo_id
   * per the Duplicate Detection requirement -- an existing company is
   * reused rather than inserted again, and a lead is only created if one
   * doesn't already exist for that company.
   */
  async importOrganizations(
    organizationId: string,
    input: ApolloImportInput,
    userId: string,
  ): Promise<{ imported: Lead[]; duplicatesSkipped: number; failed: Array<{ name: string; reason: string }> }> {
    const imported: Lead[] = [];
    let duplicatesSkipped = 0;
    const failed: Array<{ name: string; reason: string }> = [];
    const skipEmailReveal = input.organizations.length > 1;
    const context: AiUsageContext = { organizationId, userId };

    for (const org of input.organizations) {
      try {
        const people = input.people.filter((p) => p.organizationApolloId === org.apolloId);
        const { lead, wasDuplicate } = await this.importOne(
          organizationId,
          org,
          people,
          userId,
          { skipEmailReveal, searchState: input.searchState },
          context,
        );
        imported.push(lead);
        if (wasDuplicate) duplicatesSkipped += 1;
      } catch (err) {
        failed.push({ name: org.name, reason: mapImportFailure(err) });
      }
    }

    if (imported.length === 0 && failed.length > 0) {
      importFailureResponse(failed);
    }

    return { imported, duplicatesSkipped, failed };
  },

  /**
   * Persists a single enriched organization + contacts fetched directly
   * from an Apollo search result (called by the discovery controller with
   * the already-fetched org/people payload, avoiding a second Apollo call).
   */
  async importOne(
    organizationId: string,
    org: {
      apolloId: string;
      name: string;
      domain?: string | null;
      industry?: string | null;
      employeeCount?: number | null;
      city?: string | null;
    },
    people: Array<{
      apolloId: string;
      firstName: string;
      lastName?: string | null;
      email?: string | null;
      phone?: string | null;
      title?: string | null;
      linkedinUrl?: string | null;
    }>,
    userId: string,
    options?: { skipEmailReveal?: boolean; searchState?: string },
    context?: AiUsageContext,
  ): Promise<{ lead: Lead; wasDuplicate: boolean }> {
    const domain = normalizeDomain(org.domain);
    const usageContext = context ?? { organizationId, userId };

    let company: Company | null = await companiesRepository.findByApolloId(organizationId, org.apolloId);
    let wasDuplicate = Boolean(company);
    if (!company && domain) {
      company = await companiesRepository.findByDomain(organizationId, domain);
      wasDuplicate = Boolean(company);
    }

    let companyPhone: string | null = null;
    let enrichedCity = org.city ?? null;
    let enrichedIndustry = org.industry ?? null;
    let enrichedEmployeeCount = org.employeeCount ?? null;

    if (domain && !options?.skipEmailReveal) {
      const orgDetails = await enrichOrganizationByDomain(domain, usageContext);
      companyPhone = orgDetails.companyPhone ?? null;
      enrichedCity = orgDetails.city ?? enrichedCity;
      enrichedIndustry = orgDetails.industry ?? enrichedIndustry;
      enrichedEmployeeCount = orgDetails.employeeCount ?? enrichedEmployeeCount;
    }

    const importState =
      options?.searchState && options.searchState !== "India" ? options.searchState : undefined;

    if (!company) {
      company = await companiesRepository.create(organizationId, {
        name: org.name,
        domain,
        apolloId: org.apolloId,
        industry: enrichedIndustry,
        employeeCount: enrichedEmployeeCount,
        metadata: {
          ...(enrichedCity ? { city: enrichedCity } : {}),
          ...(importState ? { state: importState } : {}),
          ...(companyPhone ? { companyPhone } : {}),
        },
      });
    } else {
      const metadata = { ...(company.metadata ?? {}) } as Record<string, unknown>;
      const companyPatch: Partial<import("@bluwheelz/shared").Company> = {};
      const metadataPatch = { ...metadata };
      if (!metadata.city && enrichedCity) metadataPatch.city = enrichedCity;
      if (!metadata.state && importState) metadataPatch.state = importState;
      if (!company.industry && enrichedIndustry) companyPatch.industry = enrichedIndustry;
      if (company.employeeCount == null && enrichedEmployeeCount != null) {
        companyPatch.employeeCount = enrichedEmployeeCount;
      }
      if (companyPhone && !metadata.companyPhone) metadataPatch.companyPhone = companyPhone;
      if (JSON.stringify(metadataPatch) !== JSON.stringify(metadata) || Object.keys(companyPatch).length > 0) {
        company = await companiesRepository.update(company.id, {
          ...companyPatch,
          metadata: metadataPatch,
        });
      }
    }

    const enrichedPeople = await enrichContactsForImport(
      { apolloId: org.apolloId, name: org.name },
      people.map((p) => ({ ...p, organizationApolloId: org.apolloId })),
      options,
      usageContext,
    );

    for (const person of enrichedPeople) {
      if (!person.email && !person.linkedinUrl && !person.title) continue;

      const existingContact =
        (person.apolloId ? await contactsRepository.findByCompanyAndApolloId(company.id, person.apolloId) : null) ??
        (person.email ? await contactsRepository.findByCompanyAndEmail(company.id, person.email) : null);

      if (existingContact) {
        const patch = contactEnrichmentPatch(existingContact, person);
        if (patch) await contactsRepository.update(existingContact.id, patch);
        continue;
      }

      try {
        await contactsRepository.create({
          companyId: company.id,
          apolloId: person.apolloId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone ?? null,
          title: person.title,
          linkedinUrl: person.linkedinUrl,
          isDecisionMaker: isDecisionMakerTitle(person.title),
          metadata: {
            ...(person.phone ? { phone: person.phone } : {}),
            apolloHasEmail: person.hasEmail ?? Boolean(person.email),
          },
        } as Partial<Contact> & { companyId: string });
      } catch (err) {
        if (err instanceof ApiError && err.code === "CONFLICT") continue;
        throw err;
      }
    }

    const contacts = await contactsRepository.listByCompany(company.id);
    const primaryContact = contacts.find((c) => c.isDecisionMaker) ?? contacts[0];

    let lead = await leadsRepository.findExistingForCompany(organizationId, company.id);
    if (!lead) {
      lead = await leadsRepository.create({
        organizationId,
        companyId: company.id,
        contactId: primaryContact?.id ?? null,
        assignedTo: userId,
        source: "apollo",
        pipelineStatus: "imported",
      });
      await activitiesRepository.log({ leadId: lead.id, userId, type: "imported", payload: { source: "apollo" } });
    } else if (!lead.assignedTo) {
      lead = await leadsRepository.assign(lead.id, userId);
    }

    return { lead, wasDuplicate };
  },

  /** Reveals full Apollo contact details (email, phone, LinkedIn, legal name) for an imported company. */
  async revealCompanyContacts(organizationId: string, companyId: string, userId?: string): Promise<Contact[]> {
    const company = await companiesRepository.findById(companyId);
    if (!company || company.organizationId !== organizationId) {
      throw ApiError.notFound("Company not found");
    }
    const context: AiUsageContext = { organizationId, userId };

    const existing = await contactsRepository.listByCompany(companyId);
    const apolloBacked = existing.filter((c) => c.apolloId);

    if (apolloBacked.length === 0) {
      const enriched = await enrichContactsForImport(
        { apolloId: company.apolloId ?? company.id, name: company.name },
        [],
        { skipEmailReveal: false },
        context,
      );
      for (const person of enriched) {
        if (!person.email && !person.linkedinUrl && !person.title) continue;
        await contactsRepository.create({
          companyId: company.id,
          apolloId: person.apolloId,
          firstName: person.firstName,
          lastName: person.lastName,
          email: person.email,
          phone: person.phone ?? null,
          title: person.title,
          linkedinUrl: person.linkedinUrl,
          isDecisionMaker: isDecisionMakerTitle(person.title),
          metadata: {
            ...(person.phone ? { phone: person.phone } : {}),
            apolloHasEmail: person.hasEmail ?? Boolean(person.email),
          },
        } as Partial<Contact> & { companyId: string });
      }
      return contactsRepository.listByCompany(companyId);
    }

    for (const contact of apolloBacked) {
      const details = await enrichPersonById(contact.apolloId!, context);
      const person: ApolloPerson = {
        apolloId: contact.apolloId!,
        firstName: details.firstName ?? contact.firstName,
        lastName: details.lastName ?? contact.lastName,
        email: details.email ?? contact.email,
        phone: details.phone ?? (contact.metadata?.phone as string | undefined) ?? null,
        title: details.title ?? contact.title,
        linkedinUrl: details.linkedinUrl ?? contact.linkedinUrl,
        organizationApolloId: company.apolloId ?? company.id,
        hasEmail: Boolean(details.email ?? contact.email),
      };
      const patch = contactEnrichmentPatch(contact, person);
      if (patch) await contactsRepository.update(contact.id, patch);
    }

    return contactsRepository.listByCompany(companyId);
  },

  /** CSV bulk import path (Duplicate Detection module). */
  async importCsvRow(organizationId: string, row: CsvImportRow, userId: string): Promise<{ lead: Lead; wasDuplicate: boolean }> {
    const domain = normalizeDomain(row.domain);
    let company = domain ? await companiesRepository.findByDomain(organizationId, domain) : null;
    const wasDuplicate = Boolean(company);

    if (!company) {
      company = await companiesRepository.create(organizationId, {
        name: row.companyName,
        domain,
        industry: row.industry,
        employeeCount: row.employeeCount,
        metadata: row.city ? { city: row.city } : {},
      });
    }

    let contactId: string | null = null;
    if (row.contactEmail || row.contactFirstName) {
      const existingContact = row.contactEmail ? await contactsRepository.findByCompanyAndEmail(company.id, row.contactEmail) : null;
      const contact =
        existingContact ??
        (await contactsRepository.create({
          companyId: company.id,
          firstName: row.contactFirstName ?? "Unknown",
          lastName: row.contactLastName,
          email: row.contactEmail,
          title: row.contactTitle,
          isDecisionMaker: isDecisionMakerTitle(row.contactTitle ?? null),
        }));
      contactId = contact.id;
    }

    let lead = await leadsRepository.findExistingForCompany(organizationId, company.id);
    if (!lead) {
      lead = await leadsRepository.create({
        organizationId,
        companyId: company.id,
        contactId,
        assignedTo: userId,
        source: "import",
        pipelineStatus: "imported",
      });
      await activitiesRepository.log({ leadId: lead.id, userId, type: "imported", payload: { source: "csv" } });
    } else if (!lead.assignedTo) {
      lead = await leadsRepository.assign(lead.id, userId);
    }

    return { lead, wasDuplicate };
  },

  async checkDuplicate(organizationId: string, domain: string): Promise<boolean> {
    const normalized = normalizeDomain(domain);
    if (!normalized) throw ApiError.badRequest("A valid domain is required");
    const existing = await companiesRepository.findByDomain(organizationId, normalized);
    return Boolean(existing);
  },
};
