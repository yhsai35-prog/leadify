import type { Company } from "@bluwheelz/shared";
import type { OrgIdentity } from "../../organizations/orgIdentityService.js";

export const SIMILARITY_TOOL_SCHEMA = {
  type: "object",
  properties: {
    mostSimilarClient: { type: "string" },
    similarityPct: { type: "number", minimum: 0, maximum: 100 },
    reason: { type: "string", description: "Narrative explanation of why this existing client is the closest match" },
  },
  required: ["mostSimilarClient", "similarityPct", "reason"],
} as const;

function buildSystemPrompt(org: OrgIdentity): string {
  return `You are the Existing Client Similarity engine inside ${org.name}'s Sales Intelligence Platform (powered by Leadify).
You are given a prospect and the top vector-similarity candidates from ${org.name}'s existing customer base.
Pick the single best match and explain the similarity in concrete operational terms (industry, scale,
delivery model, geography) a salesperson can repeat to the prospect. Do not simply restate the vector
distance -- translate it into a business narrative.`;
}

export function buildSimilarityPrompt(
  org: OrgIdentity,
  prospect: Company,
  candidates: Array<{ companyName: string; vertical: string; distance: number }>,
): { system: string; userPrompt: string } {
  const userPrompt = `## Prospect

Name: ${prospect.name}
Industry: ${prospect.industry ?? "unknown"}
Employees: ${prospect.employeeCount ?? "unknown"}
Cities: ${prospect.citiesCount ?? "unknown"}

## Top Vector-Similarity Candidates from Existing ${org.name} Clients

${candidates.map((c, i) => `${i + 1}. ${c.companyName} (vertical: ${c.vertical}, cosine distance: ${c.distance.toFixed(4)})`).join("\n")}

Select the single most similar client and return your answer using the assess_similarity tool.`;

  return { system: buildSystemPrompt(org), userPrompt };
}
