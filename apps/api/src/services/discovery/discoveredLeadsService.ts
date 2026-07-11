import crypto from "node:crypto";
import type { ApolloSearchInput, DiscoveredLead, DiscoveredLeadListQuery, Lead } from "@bluwheelz/shared";
import { DiscoveredLeadStatus } from "@bluwheelz/shared";
import type { ApolloSearchResponse } from "../apollo/apolloClient.js";
import { apolloService } from "../apollo/apolloService.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { discoveredLeadsRepository } from "../../repositories/discoveredLeadsRepository.js";
import { mapImportFailure } from "../../utils/friendlyErrors.js";
import { ApiError } from "../../utils/errors.js";

function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();
}

function searchStateFromInput(input: ApolloSearchInput): string | null {
  const loc = input.locations?.[0];
  if (!loc || loc === "India") return null;
  return loc;
}

function companyCity(metadata: Record<string, unknown> | undefined): string | null {
  const city = metadata?.city;
  return typeof city === "string" ? city : null;
}

function mapLeadToDiscoveredLead(
  lead: Lead,
  discovered: DiscoveredLead | null,
  contactCount: number,
): DiscoveredLead {
  const company = lead.company;
  return {
    id: discovered?.id ?? lead.id,
    organizationId: lead.organizationId,
    searchBatchId: discovered?.searchBatchId ?? "",
    apolloId: discovered?.apolloId ?? company?.apolloId ?? "",
    companyName: company?.name ?? "Unknown company",
    domain: company?.domain ?? discovered?.domain ?? null,
    industry: company?.industry ?? discovered?.industry ?? null,
    employeeCount: company?.employeeCount ?? discovered?.employeeCount ?? null,
    city: discovered?.city ?? companyCity(company?.metadata) ?? null,
    searchState: discovered?.searchState ?? null,
    searchIndustry: discovered?.searchIndustry ?? null,
    people: discovered?.people ?? [],
    status: DiscoveredLeadStatus.PROMOTED,
    leadId: lead.id,
    companyId: lead.companyId,
    failureReason: null,
    discoveredBy: discovered?.discoveredBy ?? "",
    createdAt: discovered?.createdAt ?? lead.createdAt,
    promotedAt: discovered?.promotedAt ?? lead.createdAt,
    contactCount: discovered?.people.length ? undefined : contactCount,
  };
}

async function enrichPipelineLeads(organizationId: string, leads: Lead[]): Promise<DiscoveredLead[]> {
  if (leads.length === 0) return [];

  const leadIds = leads.map((l) => l.id);
  const companyIds = Array.from(new Set(leads.map((l) => l.companyId)));

  const [discoveredByLead, discoveredByCompany, contacts] = await Promise.all([
    discoveredLeadsRepository.findByLeadIds(organizationId, leadIds),
    discoveredLeadsRepository.findByCompanyIds(organizationId, companyIds),
    contactsRepository.listByCompanyIds(companyIds),
  ]);

  const discoveredByLeadId = new Map(discoveredByLead.map((d) => [d.leadId!, d]));
  const discoveredByCompanyId = new Map(discoveredByCompany.map((d) => [d.companyId!, d]));
  const contactsByCompany = new Map<string, number>();
  for (const contact of contacts) {
    contactsByCompany.set(contact.companyId, (contactsByCompany.get(contact.companyId) ?? 0) + 1);
  }

  return leads.map((lead) => {
    const discovered = discoveredByLeadId.get(lead.id) ?? discoveredByCompanyId.get(lead.companyId) ?? null;
    return mapLeadToDiscoveredLead(lead, discovered, contactsByCompany.get(lead.companyId) ?? 0);
  });
}

export const discoveredLeadsService = {
  async saveFromSearchResult(
    organizationId: string,
    userId: string,
    searchInput: ApolloSearchInput,
    apolloResponse: ApolloSearchResponse,
  ): Promise<{ batchId: string; discoveredLeads: DiscoveredLead[] }> {
    const batchId = crypto.randomUUID();
    const searchState = searchStateFromInput(searchInput);
    const searchIndustry = searchInput.industries[0] ?? null;
    const saved: DiscoveredLead[] = [];

    for (const org of apolloResponse.organizations) {
      const people = apolloResponse.people
        .filter((p) => p.organizationApolloId === org.apolloId)
        .map((p) => ({
          apolloId: p.apolloId,
          firstName: p.firstName,
          lastName: p.lastName,
          email: p.email,
          phone: p.phone,
          title: p.title,
          linkedinUrl: p.linkedinUrl,
          organizationApolloId: p.organizationApolloId,
          hasEmail: p.hasEmail,
        }));

      const domain = normalizeDomain(org.domain);
      let status: DiscoveredLeadStatus = DiscoveredLeadStatus.PENDING;
      let leadId: string | null = null;
      let companyId: string | null = null;

      const existingCompany =
        (await companiesRepository.findByApolloId(organizationId, org.apolloId)) ??
        (domain ? await companiesRepository.findByDomain(organizationId, domain) : null);

      if (existingCompany) {
        status = DiscoveredLeadStatus.DUPLICATE;
        companyId = existingCompany.id;
        const existingLead = await leadsRepository.findExistingForCompany(organizationId, existingCompany.id);
        leadId = existingLead?.id ?? null;
        if (existingLead) status = DiscoveredLeadStatus.PROMOTED;
      }

      const existingDiscovered = await discoveredLeadsRepository.findByApolloId(organizationId, org.apolloId);
      if (existingDiscovered?.status === DiscoveredLeadStatus.PROMOTED) {
        status = DiscoveredLeadStatus.PROMOTED;
        leadId = existingDiscovered.leadId;
        companyId = existingDiscovered.companyId;
      }

      const row = await discoveredLeadsRepository.upsert({
        organizationId,
        searchBatchId: batchId,
        apolloId: org.apolloId,
        companyName: org.name,
        domain: org.domain,
        industry: org.industry ?? searchIndustry,
        employeeCount: org.employeeCount,
        city: org.city,
        searchState,
        searchIndustry,
        people,
        status,
        leadId,
        companyId,
        discoveredBy: userId,
      });

      saved.push(row);
    }

    return { batchId, discoveredLeads: saved };
  },

  async promote(
    organizationId: string,
    userId: string,
    ids: string[],
  ): Promise<{ promoted: Lead[]; failed: Array<{ id: string; name: string; reason: string }> }> {
    const rows = await discoveredLeadsRepository.findByIds(organizationId, ids);
    if (rows.length === 0) throw ApiError.notFound("No discovered leads found for the selected IDs");

    const promoted: Lead[] = [];
    const failed: Array<{ id: string; name: string; reason: string }> = [];

    for (const row of rows) {
      if (row.status === DiscoveredLeadStatus.PROMOTED || row.status === DiscoveredLeadStatus.DUPLICATE) {
        if (row.leadId) {
          const lead = await leadsRepository.findById(row.leadId);
          if (lead) promoted.push(lead);
        }
        continue;
      }

      if (row.status !== DiscoveredLeadStatus.PENDING && row.status !== DiscoveredLeadStatus.FAILED) {
        continue;
      }

      try {
        const { lead } = await apolloService.importOne(
          organizationId,
          {
            apolloId: row.apolloId,
            name: row.companyName,
            domain: row.domain,
            industry: row.industry,
            employeeCount: row.employeeCount,
            city: row.city,
          },
          row.people.map((p) => ({
            apolloId: p.apolloId,
            firstName: p.firstName,
            lastName: p.lastName ?? null,
            email: p.email ?? null,
            phone: p.phone ?? null,
            title: p.title ?? null,
            linkedinUrl: p.linkedinUrl ?? null,
          })),
          userId,
          {
            skipEmailReveal: false,
            searchState: row.searchState ?? undefined,
          },
        );

        await discoveredLeadsRepository.update(row.id, {
          status: DiscoveredLeadStatus.PROMOTED,
          leadId: lead.id,
          companyId: lead.companyId,
          promotedAt: new Date().toISOString(),
          failureReason: null,
        });
        promoted.push(lead);
      } catch (err) {
        const reason = mapImportFailure(err);
        await discoveredLeadsRepository.update(row.id, {
          status: DiscoveredLeadStatus.FAILED,
          failureReason: reason,
        });
        failed.push({ id: row.id, name: row.companyName, reason });
      }
    }

    return { promoted, failed };
  },

  async list(
    organizationId: string,
    query: DiscoveredLeadListQuery,
  ): Promise<{ data: DiscoveredLead[]; total: number }> {
    const { status, page, limit } = query;

    if (status === DiscoveredLeadStatus.PENDING || status === DiscoveredLeadStatus.FAILED) {
      return discoveredLeadsRepository.list(organizationId, query);
    }

    if (status === DiscoveredLeadStatus.PROMOTED) {
      const { data: leads, total } = await leadsRepository.listForFoundView(organizationId, {
        offset: (page - 1) * limit,
        limit,
      });
      return { data: await enrichPipelineLeads(organizationId, leads), total };
    }

    const pendingOrphans = await discoveredLeadsRepository.listPendingOrphans(organizationId);
    const orphanCount = pendingOrphans.length;
    const leadOffset = Math.max(0, (page - 1) * limit - orphanCount);
    const leadLimit = page === 1 ? Math.max(0, limit - orphanCount) : limit;

    const { data: leads, total: pipelineTotal } = await leadsRepository.listForFoundView(organizationId, {
      offset: leadOffset,
      limit: leadLimit,
    });
    const enriched = await enrichPipelineLeads(organizationId, leads);
    const data = page === 1 ? [...pendingOrphans, ...enriched] : enriched;

    return { data, total: pipelineTotal + orphanCount };
  },
};
