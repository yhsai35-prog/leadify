import { EMBEDDING_DIMENSIONS, similarityResultSchema, type LeadSimilarityMatch } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import { SIMILARITY_TOOL_SCHEMA, buildSimilarityPrompt } from "../claude/prompts/similarity.prompt.js";
import { generateEmbedding } from "../embeddings/embeddingsProvider.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { similarityRepository } from "../../repositories/similarityRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { ApiError } from "../../utils/errors.js";

function companyProfileText(company: { name: string; industry: string | null; employeeCount: number | null; citiesCount: number | null }): string {
  return `${company.name} operates in ${company.industry ?? "an unspecified industry"} with approximately ${company.employeeCount ?? "an unknown number of"} employees across ${company.citiesCount ?? "an unknown number of"} cities.`;
}

export const similarityService = {
  /**
   * Embeds the prospect's profile if missing, finds the top-3 nearest
   * existing-client profiles by cosine distance, then asks Claude to turn
   * that into a narrative "most similar client" recommendation with a
   * human-readable reason. Persists all ranked candidates, not just the top
   * one, so the UI can show a ranked list if needed.
   */
  async computeSimilarityForLead(leadId: string, userId?: string): Promise<LeadSimilarityMatch[]> {
    const lead = await leadsRepository.findById(leadId);
    if (!lead) throw ApiError.notFound("Lead not found");
    const company = lead.company ?? (await companiesRepository.findById(lead.companyId));
    if (!company) throw ApiError.notFound("Company not found for this lead");

    let embedding = company.embedding ?? null;
    if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) {
      embedding = await generateEmbedding(companyProfileText(company));
      await companiesRepository.updateEmbedding(company.id, embedding);
    }

    const nearest = await companiesRepository.findTopSimilarExistingClients(embedding, 3);
    if (nearest.length === 0) {
      await similarityRepository.replaceMatchesForLead(leadId, []);
      return [];
    }

    const profiles = await similarityRepository.listExistingClientProfiles();
    const candidates = nearest.map((n) => {
      const profile = profiles.find((p) => p.id === n.profileId);
      return { companyName: n.companyName, vertical: profile?.vertical ?? "unknown", distance: n.distance };
    });

    const orgIdentity = await getOrgIdentity(lead.organizationId);
    const { system, userPrompt } = buildSimilarityPrompt(orgIdentity, company, candidates);
    const { result } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_QUALIFICATION,
      system,
      userPrompt,
      toolName: "assess_similarity",
      toolDescription: "Return the single most similar existing client with a narrative reason",
      toolInputSchema: SIMILARITY_TOOL_SCHEMA,
      parse: (input) => similarityResultSchema.parse(input),
      context: { organizationId: lead.organizationId, userId, action: "similarity" },
    });

    const topMatch = nearest.find((n) => n.companyName === result.mostSimilarClient) ?? nearest[0]!;

    const matches = nearest.map((n) => ({
      existingClientProfileId: n.profileId,
      similarityPct: n.companyName === topMatch.companyName ? result.similarityPct : Math.max(0, result.similarityPct - 15),
      reason: n.companyName === topMatch.companyName ? result.reason : `Vector-similarity candidate (cosine distance ${n.distance.toFixed(4)}).`,
    }));

    await similarityRepository.replaceMatchesForLead(leadId, matches);
    return similarityRepository.listMatchesForLead(leadId);
  },

  async getMatchesForLead(leadId: string): Promise<LeadSimilarityMatch[]> {
    return similarityRepository.listMatchesForLead(leadId);
  },

  async getProfileForCompany(companyId: string) {
    return similarityRepository.findProfileByCompanyId(companyId);
  },

  async listClientsWithStats(organizationId: string) {
    const [profiles, counts, coverage] = await Promise.all([
      similarityRepository.listExistingClientProfiles(),
      similarityRepository.countProspectsByProfile(organizationId),
      similarityRepository.similarityCoverage(organizationId),
    ]);

    const clients = profiles.map((p) => ({
      companyId: p.companyId,
      companyName: p.companyName,
      vertical: p.vertical,
      profileSummary: p.profileSummary,
      prospectMatchCount: counts[p.id] ?? 0,
    }));

    return { clients, coverage };
  },

  async findProspectsSimilarToClient(
    organizationId: string,
    clientName: string,
    limit = 20,
  ) {
    const profiles = await similarityRepository.listExistingClientProfiles();
    const match = profiles.find((p) => p.companyName.toLowerCase().includes(clientName.toLowerCase()));
    if (!match) return { client: null, prospects: [] };

    const prospects = await similarityRepository.listProspectsForProfile(organizationId, match.id, limit);
    return {
      client: {
        companyId: match.companyId,
        companyName: match.companyName,
        vertical: match.vertical,
        profileSummary: match.profileSummary,
      },
      prospects,
    };
  },
};
