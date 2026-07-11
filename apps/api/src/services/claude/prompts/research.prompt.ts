import type { Company } from "@bluwheelz/shared";
import type { OrgIdentity } from "../../organizations/orgIdentityService.js";

export const RESEARCH_TOOL_SCHEMA = {
  type: "object",
  properties: {
    websiteSummary: { type: "string" },
    businessModel: { type: "string" },
    expansionSignals: { type: "array", items: { type: "string" } },
    growthIndicators: { type: "array", items: { type: "string" } },
    news: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          url: { type: "string" },
          date: { type: "string" },
        },
        required: ["title", "url"],
      },
    },
    fleetIndicators: { type: "array", items: { type: "string" }, description: "Any mentions of fleet size, vehicles, warehouses, delivery hubs" },
  },
  required: ["websiteSummary", "businessModel", "expansionSignals", "growthIndicators", "news", "fleetIndicators"],
} as const;

function buildSystemPrompt(org: OrgIdentity): string {
  return `You are the Company Intelligence engine inside ${org.name}'s Sales Intelligence Platform (powered by Leadify).
Summarize only what is supported by the provided source material (website text and news snippets). Do not
invent statistics, funding amounts, or fleet numbers that are not explicitly present in the source text.
If the source material is thin, say so plainly rather than padding the summary.`;
}

export function buildResearchPrompt(org: OrgIdentity, company: Company, sourceText: string): { system: string; userPrompt: string } {
  const userPrompt = `## Company

Name: ${company.name}
Industry: ${company.industry ?? "unknown"}
Domain: ${company.domain ?? "unknown"}

## Source Material (scraped website content and recent news snippets)

${sourceText || "No source material could be retrieved."}

Extract structured intelligence using the research_company tool. Focus especially on operational signals
(anything about vehicles, warehouses, delivery hubs, 3PL usage, scale of operations) since that most
directly informs ${org.name}'s pitch. Seller context: ${org.profile}`;

  return { system: buildSystemPrompt(org), userPrompt };
}
