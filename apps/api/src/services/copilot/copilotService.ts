import type Anthropic from "@anthropic-ai/sdk";
import {
  type AuthenticatedUser,
  type CopilotMessage,
  type CopilotNotification,
} from "@bluwheelz/shared";
import { anthropic } from "../claude/client.js";
import { env } from "../../config/env.js";
import { buildCopilotSystemPrompt, COPILOT_TOOLS } from "../claude/prompts/copilot.system.prompt.js";
import { getOrgIdentity } from "../organizations/orgIdentityService.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { leadScoresRepository } from "../../repositories/leadScoresRepository.js";
import { similarityRepository } from "../../repositories/similarityRepository.js";
import { companiesRepository } from "../../repositories/companiesRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { companyIntelligenceRepository } from "../../repositories/companyIntelligenceRepository.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { outreachService } from "../outreach/outreachService.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";
import { logger } from "../../config/logger.js";
import { formatToolSummary } from "./formatToolSummary.js";

const MAX_TOOL_ITERATIONS = 4;

async function analyzeCompany(organizationId: string, companyName: string): Promise<unknown> {
  const matches = await companiesRepository.findByNameFuzzy(organizationId, companyName, 5);

  if (matches.length === 0) {
    return { notFound: true, companyName };
  }

  const exact = matches.find((c) => c.name.toLowerCase() === companyName.toLowerCase());
  const single =
    exact ??
    (matches.length === 1
      ? matches[0]
      : matches.find((c) => c.name.toLowerCase().includes(companyName.toLowerCase())));

  if (!single && matches.length > 1) {
    return {
      ambiguous: true,
      candidates: matches.slice(0, 3).map((c) => ({ id: c.id, name: c.name, industry: c.industry })),
    };
  }

  const company = single!;
  const [contacts, lead, intelligence] = await Promise.all([
    contactsRepository.listByCompany(company.id),
    leadsRepository.findExistingForCompany(organizationId, company.id),
    companyIntelligenceRepository.findLatestByCompany(company.id),
  ]);

  const [qualification, similarity, emails, activities] = lead
    ? await Promise.all([
        leadScoresRepository.findLatest(lead.id),
        similarityRepository.listMatchesForLead(lead.id),
        emailsRepository.listByLead(lead.id),
        activitiesRepository.listByLead(lead.id),
      ])
    : [null, [], [], []];

  const metadata = company.metadata as { city?: string; companyPhone?: string } | undefined;

  return {
    company: {
      id: company.id,
      name: company.name,
      domain: company.domain,
      industry: company.industry,
      employeeCount: company.employeeCount,
      revenueInrCr: company.revenueInrCr,
      citiesCount: company.citiesCount,
      fleetSizeEstimate: company.fleetSizeEstimate,
      isExistingClient: company.isExistingClient,
      city: metadata?.city,
      companyPhone: metadata?.companyPhone,
    },
    contacts: contacts.map((c) => {
      const contactMeta = c.metadata as { phone?: string } | undefined;
      return {
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
        title: c.title,
        email: c.email,
        phone: contactMeta?.phone,
        linkedinUrl: c.linkedinUrl,
        isDecisionMaker: c.isDecisionMaker,
      };
    }),
    lead: lead
      ? {
          id: lead.id,
          pipelineStatus: lead.pipelineStatus,
          priority: lead.priority,
          source: lead.source,
          icpScore: lead.icpScore,
          assignedTo: lead.assignedTo,
        }
      : null,
    qualification: qualification
      ? {
          icpScore: qualification.icpScore,
          priority: qualification.priority,
          reasoning: qualification.reasoning,
          painPoints: qualification.painPoints,
          industryAnalysis: qualification.industryAnalysis,
          scoreBreakdown: qualification.scoreBreakdown,
        }
      : null,
    similarity: similarity.slice(0, 3).map((m) => ({
      existingClientName: m.existingClientName,
      similarityPct: m.similarityPct,
      reason: m.reason,
    })),
    intelligence: intelligence
      ? {
          websiteSummary: intelligence.websiteSummary,
          businessModel: intelligence.businessModel,
          fleetIndicators: intelligence.fleetIndicators,
          growthIndicators: intelligence.growthIndicators,
          expansionSignals: intelligence.expansionSignals,
          researchedAt: intelligence.researchedAt,
        }
      : null,
    outreach: emails.slice(0, 3).map((e) => ({
      subject: e.subject,
      status: e.status,
      createdAt: e.createdAt,
    })),
    activities: activities.slice(0, 5).map((a) => ({
      type: a.type,
      createdAt: a.createdAt,
      payload: a.payload,
    })),
  };
}

async function executeTool(name: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<unknown> {
  switch (name) {
    case "analyze_company":
      return analyzeCompany(user.organizationId, input.companyName as string);

    case "search_leads": {
      const { data } = await leadsRepository.list(
        user.organizationId,
        {
          industry: input.industry as string | undefined,
          pipelineStatus: input.pipelineStatus as never,
          priority: input.priority as never,
          search: input.search as string | undefined,
        },
        { page: 1, limit: (input.limit as number) ?? 25 },
      );
      return data.map((l) => ({
        id: l.id,
        company: l.company?.name,
        industry: l.company?.industry,
        status: l.pipelineStatus,
        priority: l.priority,
        icpScore: l.icpScore,
      }));
    }
    case "get_lead_detail": {
      const lead = await leadsRepository.findById(input.leadId as string);
      if (!lead) return { error: "Lead not found" };
      const score = await leadScoresRepository.findLatest(lead.id);
      return { lead, latestScore: score };
    }
    case "get_top_scored_leads": {
      const { data } = await leadsRepository.list(
        user.organizationId,
        { industry: input.industry as string | undefined },
        { page: 1, limit: 50 },
      );
      const priorityRank = { critical: 4, high: 3, medium: 2, low: 1 } as const;
      return data
        .sort((a, b) => {
          const scoreDiff = (b.icpScore ?? -1) - (a.icpScore ?? -1);
          if (scoreDiff !== 0) return scoreDiff;
          return priorityRank[b.priority] - priorityRank[a.priority];
        })
        .slice(0, (input.limit as number) ?? 10)
        .map((l) => ({
          id: l.id,
          company: l.company?.name,
          industry: l.company?.industry,
          icpScore: l.icpScore,
          priority: l.priority,
        }));
    }
    case "find_similar_to_client": {
      const profiles = await similarityRepository.listExistingClientProfiles();
      const match = profiles.find((p) => p.companyName.toLowerCase().includes((input.clientName as string).toLowerCase()));
      if (!match) return { error: `No existing client found matching "${input.clientName}"` };
      const { data } = await leadsRepository.list(user.organizationId, {}, { page: 1, limit: 50 });
      const results = [];
      for (const lead of data) {
        const matches = await similarityRepository.listMatchesForLead(lead.id);
        const found = matches.find((m) => m.existingClientProfileId === match.id);
        if (found) results.push({ leadId: lead.id, company: lead.company?.name, similarityPct: found.similarityPct, reason: found.reason });
      }
      return results.sort((a, b) => b.similarityPct - a.similarityPct).slice(0, 10);
    }
    case "explain_score": {
      const score = await leadScoresRepository.findLatest(input.leadId as string);
      if (!score) return { error: "This lead has not been qualified yet" };
      return score;
    }
    case "generate_email_draft": {
      const lead = await leadsRepository.findById(input.leadId as string);
      if (!lead?.contactId) return { error: "This lead has no contact to draft outreach for" };
      const email = await outreachService.generateEmail(lead.id, lead.contactId, "initial", "professional", user.id);
      return { emailId: email.id, subject: email.subject, status: email.status, note: "Draft created. It still requires approval before it can be sent." };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

function attachNotification(messages: CopilotMessage[], notification: CopilotNotification): void {
  const lastAssistantIdx = messages.map((m, i) => (m.role === "assistant" ? i : -1)).filter((i) => i >= 0).pop();
  const target = lastAssistantIdx != null ? messages[lastAssistantIdx] : undefined;
  if (target) {
    target.notification = notification;
  } else {
    messages.push({
      role: "assistant",
      content: notification.description ?? notification.title,
      notification,
    });
  }
}

export const copilotService = {
  async chat(user: AuthenticatedUser, message: string, history: CopilotMessage[]): Promise<CopilotMessage[]> {
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content })),
      { role: "user", content: message },
    ];

    const newMessages: CopilotMessage[] = [];
    let pendingNotification: CopilotNotification | undefined;
    const systemPrompt = buildCopilotSystemPrompt(await getOrgIdentity(user.organizationId));

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      try {
        aiUsageRepository.record(user.organizationId, user.id, "claude", "copilot");
      } catch (err) {
        logger.warn({ err }, "Failed to record Copilot AI usage event");
      }
      const response = await anthropic.messages.create({
        model: env.CLAUDE_MODEL_COPILOT,
        max_tokens: 2048,
        system: systemPrompt,
        tools: COPILOT_TOOLS,
        messages,
      });

      const toolUses = response.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");

      for (const text of textBlocks) {
        if (text.text.trim()) {
          const msg: CopilotMessage = { role: "assistant", content: text.text };
          if (pendingNotification) {
            msg.notification = pendingNotification;
            pendingNotification = undefined;
          }
          newMessages.push(msg);
        }
      }

      if (toolUses.length === 0 || response.stop_reason !== "tool_use") {
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUses) {
        let output: unknown;
        try {
          output = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, user);
        } catch (err) {
          logger.error({ err, tool: toolUse.name }, "Copilot tool execution failed");
          output = { error: "Tool execution failed" };
        }
        const input = toolUse.input as Record<string, unknown>;
        const summary = formatToolSummary(toolUse.name, input, output);
        if (summary.notification) pendingNotification = summary.notification;
        toolResults.push({ type: "tool_result", tool_use_id: toolUse.id, content: JSON.stringify(output) });
      }
      messages.push({ role: "user", content: toolResults });
    }

    if (pendingNotification) {
      attachNotification(newMessages, pendingNotification);
    }

    return newMessages;
  },
};
