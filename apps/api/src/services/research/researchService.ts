import { companyIntelligenceResultSchema, type CompanyIntelligence } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import { RESEARCH_TOOL_SCHEMA, buildResearchPrompt } from "../claude/prompts/research.prompt.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { companyIntelligenceRepository } from "../../repositories/companyIntelligenceRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { fetchWebsiteText } from "./websiteFetcher.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { ApiError } from "../../utils/errors.js";

export const researchService = {
  /**
   * Fetches lightweight source material (company website text) and asks
   * Claude to synthesize it into structured intelligence. News search is a
   * best-effort placeholder for MVP -- a dedicated news API integration
   * (e.g. NewsAPI/Bing News) is tracked in the roadmap; for now `news` will
   * often be empty and that's an accurate reflection of available signal.
   */
  async researchCompany(companyId: string, leadId: string | undefined, userId: string): Promise<CompanyIntelligence> {
    const company = await companiesRepository.findById(companyId);
    if (!company) throw ApiError.notFound("Company not found");

    const sourceText = await fetchWebsiteText(company.domain);
    const orgIdentity = await getOrgIdentity(company.organizationId);

    const { system, userPrompt } = buildResearchPrompt(orgIdentity, company, sourceText);
    const { result } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_RESEARCH,
      system,
      userPrompt,
      toolName: "research_company",
      toolDescription: "Return structured company intelligence extracted from the source material",
      toolInputSchema: RESEARCH_TOOL_SCHEMA,
      parse: (input) => companyIntelligenceResultSchema.parse(input),
      context: { organizationId: company.organizationId, userId, action: "research" },
    });

    const intelligence = await companyIntelligenceRepository.create({
      companyId,
      websiteSummary: result.websiteSummary,
      businessModel: result.businessModel,
      expansionSignals: result.expansionSignals,
      growthIndicators: result.growthIndicators,
      news: result.news,
      fleetIndicators: result.fleetIndicators,
      source: company.domain ? [company.domain] : [],
    });

    if (leadId) {
      await activitiesRepository.log({ leadId, userId, type: "researched", payload: { companyId } });
      const lead = await leadsRepository.findById(leadId);
      if (lead?.pipelineStatus === "qualified") {
        await leadsRepository.updateStatus(leadId, "research_complete");
        await activitiesRepository.log({ leadId, userId, type: "status_changed", payload: { to: "research_complete" } });
      }
    }

    return intelligence;
  },

  async getLatestIntelligence(companyId: string): Promise<CompanyIntelligence> {
    const intelligence = await companyIntelligenceRepository.findLatestByCompany(companyId);
    if (!intelligence) throw ApiError.notFound("No intelligence has been generated for this company yet");
    return intelligence;
  },
};
