import { outreachGenerationResultSchema, type Email, type EmailType } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import { OUTREACH_TOOL_SCHEMA, buildOutreachPrompt } from "../claude/prompts/outreach.prompt.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { leadScoresRepository } from "../../repositories/leadScoresRepository.js";
import { similarityRepository } from "../../repositories/similarityRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { knowledgeBaseContextService } from "../knowledgeBase/knowledgeBaseContextService.js";
import { ApiError } from "../../utils/errors.js";

export const outreachService = {
  /**
   * Generates a full outreach package (subject, email, LinkedIn message,
   * follow-up, call script) and stores it as a `draft` email. This never
   * transitions the email past `draft` -- moving to `pending_approval`
   * requires an explicit BDE submit action (see ApprovalService.submit).
   */
  async generateEmail(
    leadId: string,
    contactId: string,
    type: EmailType,
    tone: string,
    userId: string,
  ): Promise<Email> {
    const lead = await leadsRepository.findById(leadId);
    if (!lead) throw ApiError.notFound("Lead not found");

    const [company, contact, latestScore, matches] = await Promise.all([
      lead.company ?? companiesRepository.findById(lead.companyId),
      contactsRepository.findById(contactId),
      leadScoresRepository.findLatest(leadId),
      similarityRepository.listMatchesForLead(leadId),
    ]);
    if (!company) throw ApiError.notFound("Company not found for this lead");
    if (!contact) throw ApiError.notFound("Contact not found");

    const topMatch = matches[0] ?? null;
    const orgIdentity = await getOrgIdentity(lead.organizationId);
    const kbArticles = await knowledgeBaseContextService.getRelevantArticles(
      lead.organizationId,
      `${company.name} ${company.industry ?? ""}`.trim(),
    );

    const { system, userPrompt } = buildOutreachPrompt(
      orgIdentity,
      company,
      contact,
      latestScore,
      topMatch?.existingClientName ?? null,
      topMatch?.reason ?? null,
      tone,
      knowledgeBaseContextService.formatForPrompt(kbArticles),
    );

    const { result, promptHash } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_OUTREACH,
      system,
      userPrompt,
      toolName: "generate_outreach",
      toolDescription: "Return the full outreach package for this contact",
      toolInputSchema: OUTREACH_TOOL_SCHEMA,
      parse: (input) => outreachGenerationResultSchema.parse(input),
      maxTokens: 4096,
      context: { organizationId: lead.organizationId, userId, action: "generate_email" },
    });

    const email = await emailsRepository.create({
      leadId,
      contactId,
      campaignId: lead.campaignId ?? null,
      type,
      subject: result.subject,
      bodyHtml: result.emailBodyHtml,
      bodyText: result.emailBodyText,
      linkedinMessage: result.linkedinMessage,
      callScript: result.callScript,
      status: "draft",
      generatedBy: "ai",
      modelVersion: env.CLAUDE_MODEL_OUTREACH,
      promptHash,
      createdBy: userId,
    });

    await activitiesRepository.log({ leadId, userId, type: "draft_created", payload: { emailId: email.id } });

    if (lead.pipelineStatus === "research_complete") {
      await leadsRepository.updateStatus(leadId, "draft_ready");
      await activitiesRepository.log({ leadId, userId, type: "status_changed", payload: { to: "draft_ready" } });
    }

    return email;
  },

  /** Regenerating never mutates the original draft in place -- it supersedes it, preserving history for audit. */
  async regenerateEmail(emailId: string, userId: string): Promise<Email> {
    const existing = await emailsRepository.findById(emailId);
    if (!existing) throw ApiError.notFound("Email not found");
    if (existing.status !== "draft" && existing.status !== "rejected") {
      throw ApiError.invariantViolation("Only draft or rejected emails can be regenerated");
    }

    await emailsRepository.markSuperseded(emailId);
    return this.generateEmail(existing.leadId, existing.contactId, existing.type, "professional", userId);
  },

  async listEmailsForLead(leadId: string): Promise<Email[]> {
    return emailsRepository.listByLead(leadId);
  },

  async updateDraft(emailId: string, input: Partial<Email>): Promise<Email> {
    const existing = await emailsRepository.findById(emailId);
    if (!existing) throw ApiError.notFound("Email not found");
    if (existing.status !== "draft") {
      throw ApiError.invariantViolation("Only draft emails can be edited directly; use edit-approve for emails already in review");
    }
    return emailsRepository.update(emailId, { ...input, generatedBy: "human" });
  },
};
