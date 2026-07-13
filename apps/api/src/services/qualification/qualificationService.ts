import { qualificationResultSchema, type Company, type LeadScore } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import { QUALIFICATION_TOOL_SCHEMA, buildQualificationPrompt } from "../claude/prompts/qualification.prompt.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { leadScoresRepository } from "../../repositories/leadScoresRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { knowledgeBaseContextService } from "../knowledgeBase/knowledgeBaseContextService.js";
import { ApiError } from "../../utils/errors.js";

export const qualificationService = {
  /**
   * Runs AI qualification for a lead's company and persists an immutable
   * versioned score. `leads.icp_score`/`priority` are kept in sync via the
   * `sync_lead_latest_score` DB trigger (see 001_initial_schema.sql), so
   * this function does not need to update the lead row directly.
   */
  async qualifyLead(leadId: string, userId: string): Promise<LeadScore> {
    const lead = await leadsRepository.findById(leadId);
    if (!lead) throw ApiError.notFound("Lead not found");

    const company = lead.company ?? (await companiesRepository.findById(lead.companyId));
    if (!company) throw ApiError.notFound("Company not found for this lead");

    const similarSummaries = await this.buildSimilaritySummaries(company);
    const orgIdentity = await getOrgIdentity(lead.organizationId);
    const kbArticles = await knowledgeBaseContextService.getRelevantArticles(
      lead.organizationId,
      `${company.name} ${company.industry ?? ""}`.trim(),
    );

    const { system, userPrompt } = buildQualificationPrompt(
      orgIdentity,
      company,
      similarSummaries,
      knowledgeBaseContextService.formatForPrompt(kbArticles),
    );
    const { result, promptHash } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_QUALIFICATION,
      system,
      userPrompt,
      toolName: "qualify_company",
      toolDescription: "Return the structured ICP qualification for this company",
      toolInputSchema: QUALIFICATION_TOOL_SCHEMA,
      parse: (input) => qualificationResultSchema.parse(input),
      context: { organizationId: lead.organizationId, userId, action: "qualify" },
    });

    const version = await leadScoresRepository.nextVersion(leadId);
    const score = await leadScoresRepository.create({
      leadId,
      version,
      icpScore: Math.round(result.icpScore),
      priority: result.priority,
      reasoning: result.reasoning,
      painPoints: result.painPoints,
      industryAnalysis: result.industryAnalysis,
      scoreBreakdown: result.scoreBreakdown,
      modelVersion: env.CLAUDE_MODEL_QUALIFICATION,
      promptHash,
      createdBy: "ai",
    });

    await activitiesRepository.log({
      leadId,
      userId,
      type: "qualified",
      payload: { icpScore: score.icpScore, priority: score.priority, version: score.version },
    });

    if (lead.pipelineStatus === "imported") {
      await leadsRepository.updateStatus(leadId, "qualified");
      await activitiesRepository.log({ leadId, userId, type: "status_changed", payload: { to: "qualified" } });
    }

    return score;
  },

  /** Best-effort, non-fatal similarity lookup so qualification never blocks on the similarity subsystem. */
  async buildSimilaritySummaries(company: Company): Promise<string[]> {
    if (!company.embedding) return [];
    try {
      const matches = await companiesRepository.findTopSimilarExistingClients(company.embedding, 3);
      return matches.map((m) => `${m.companyName} (cosine distance ${m.distance.toFixed(4)})`);
    } catch {
      return [];
    }
  },

  async getScoreHistory(leadId: string) {
    return leadScoresRepository.listByLead(leadId);
  },

  async getLatestScore(leadId: string) {
    const score = await leadScoresRepository.findLatest(leadId);
    if (!score) throw ApiError.notFound("This lead has not been qualified yet");
    return score;
  },
};
