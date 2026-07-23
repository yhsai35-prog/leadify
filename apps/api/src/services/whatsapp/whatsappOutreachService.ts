import { whatsappGenerationResultSchema } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { leadScoresRepository } from "../../repositories/leadScoresRepository.js";
import { similarityRepository } from "../../repositories/similarityRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { whatsappMessagesRepository } from "../../repositories/whatsappMessagesRepository.js";
import { whatsappTemplatesRepository } from "../../repositories/whatsappTemplatesRepository.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { knowledgeBaseContextService } from "../knowledgeBase/knowledgeBaseContextService.js";
import { ApiError } from "../../utils/errors.js";
import type { WhatsappMessage } from "@bluwheelz/shared";

const WHATSAPP_OUTREACH_TOOL = {
  name: "generate_whatsapp_outreach",
  description: "Fill WhatsApp template body variables and produce a preview",
  input_schema: {
    type: "object",
    properties: {
      bodyVariables: {
        type: "array",
        items: { type: "string" },
        description: "Ordered body parameter values for the Meta template",
      },
      bodyPreview: {
        type: "string",
        description: "Human-readable preview of the final message",
      },
    },
    required: ["bodyVariables", "bodyPreview"],
  },
} as const;

function countBodyPlaceholders(components: unknown[]): number {
  let max = 0;
  for (const raw of components) {
    const c = raw as { type?: string; text?: string };
    if (String(c.type).toUpperCase() !== "BODY" || !c.text) continue;
    const matches = c.text.match(/\{\{(\d+)\}\}/g) ?? [];
    for (const m of matches) {
      const n = Number(m.replace(/\D/g, ""));
      if (n > max) max = n;
    }
  }
  return max;
}

export const whatsappOutreachService = {
  async generateMessage(input: {
    leadId: string;
    contactId: string;
    templateName: string;
    templateLanguage: string;
    tone: string;
    userId: string;
    campaignId?: string | null;
  }): Promise<WhatsappMessage> {
    const lead = await leadsRepository.findById(input.leadId);
    if (!lead) throw ApiError.notFound("Lead not found");

    const [company, contact, latestScore, matches, template] = await Promise.all([
      lead.company ?? companiesRepository.findById(lead.companyId),
      contactsRepository.findById(input.contactId),
      leadScoresRepository.findLatest(input.leadId),
      similarityRepository.listMatchesForLead(input.leadId),
      whatsappTemplatesRepository.findByNameLanguage(
        lead.organizationId,
        input.templateName,
        input.templateLanguage,
      ),
    ]);

    if (!company) throw ApiError.notFound("Company not found for this lead");
    if (!contact) throw ApiError.notFound("Contact not found");
    if (!contact.phone) {
      throw ApiError.badRequest(
        "This contact does not have a phone number. Add or reveal a phone before generating WhatsApp outreach.",
      );
    }
    if (!template) {
      throw ApiError.badRequest(
        `Template "${input.templateName}" (${input.templateLanguage}) not found. Sync templates from Meta first.`,
      );
    }

    const placeholderCount = countBodyPlaceholders(template.components);
    const topMatch = matches[0] ?? null;
    const orgIdentity = await getOrgIdentity(lead.organizationId);
    const kbArticles = await knowledgeBaseContextService.getRelevantArticles(
      lead.organizationId,
      `${company.name} ${company.industry ?? ""}`.trim(),
    );

    const system = `You fill WhatsApp Business template variables for ${orgIdentity.name} outbound sales.
Return exactly ${placeholderCount} bodyVariables (or an empty array if the template has no placeholders).
Tone: ${input.tone}. Keep each variable short (under 40 chars). No URLs unless the template expects them.
Never invent fake customer names.`;

    const userPrompt = `Contact: ${contact.firstName} ${contact.lastName ?? ""} (${contact.title ?? "decision maker"})
Company: ${company.name} | Industry: ${company.industry ?? "n/a"}
ICP score: ${latestScore?.icpScore ?? "n/a"} | Reasoning: ${latestScore?.reasoning ?? "n/a"}
Similar client: ${topMatch?.existingClientName ?? "n/a"} — ${topMatch?.reason ?? ""}
Org profile: ${orgIdentity.profile}
KB:
${knowledgeBaseContextService.formatForPrompt(kbArticles)}

Template name: ${template.name}
Template body components: ${JSON.stringify(template.components)}
Fill generate_whatsapp_outreach.`;

    const { result, promptHash } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_OUTREACH,
      system,
      userPrompt,
      toolName: WHATSAPP_OUTREACH_TOOL.name,
      toolDescription: WHATSAPP_OUTREACH_TOOL.description,
      toolInputSchema: WHATSAPP_OUTREACH_TOOL.input_schema,
      parse: (raw: unknown) => whatsappGenerationResultSchema.parse(raw),
      maxTokens: 2048,
      context: { organizationId: lead.organizationId, userId: input.userId, action: "generate_whatsapp" },
    });

    const bodyVariables = result.bodyVariables.slice(0, Math.max(placeholderCount, result.bodyVariables.length));
    while (bodyVariables.length < placeholderCount) bodyVariables.push(company.name);

    const components =
      bodyVariables.length > 0
        ? [
            {
              type: "body",
              parameters: bodyVariables.map((text) => ({ type: "text", text })),
            },
          ]
        : [];

    const message = await whatsappMessagesRepository.create({
      leadId: input.leadId,
      contactId: input.contactId,
      campaignId: input.campaignId ?? lead.campaignId ?? null,
      templateName: input.templateName,
      templateLanguage: input.templateLanguage,
      templateComponents: components,
      bodyPreview: result.bodyPreview,
      status: "draft",
      generatedBy: "ai",
      modelVersion: env.CLAUDE_MODEL_OUTREACH,
      promptHash,
      createdBy: input.userId,
    });

    await activitiesRepository.log({
      leadId: input.leadId,
      userId: input.userId,
      type: "draft_created",
      payload: { whatsappMessageId: message.id, channel: "whatsapp", templateName: input.templateName },
    });

    if (lead.pipelineStatus === "imported" || lead.pipelineStatus === "qualified" || lead.pipelineStatus === "research_complete") {
      await leadsRepository.updateStatus(input.leadId, "draft_ready");
    }

    return message;
  },
};
