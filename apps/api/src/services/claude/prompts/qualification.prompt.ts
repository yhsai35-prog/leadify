import {
  ICP_OPERATIONS_THRESHOLDS,
  ICP_SCORE_WEIGHTS,
  ICP_SIZE_THRESHOLDS,
  ICP_TARGET_INDUSTRIES,
  type Company,
} from "@bluwheelz/shared";
import type { OrgIdentity } from "../../organizations/orgIdentityService.js";

export const QUALIFICATION_TOOL_SCHEMA = {
  type: "object",
  properties: {
    icpScore: { type: "number", minimum: 0, maximum: 100 },
    priority: { type: "string", enum: ["low", "medium", "high", "critical"] },
    reasoning: { type: "string", description: "2-4 sentence explanation of WHY this score was given" },
    painPoints: { type: "array", items: { type: "string" }, description: "Specific operational pain points this company likely has that the selling organization solves" },
    industryAnalysis: {
      type: "object",
      properties: {
        vertical: { type: "string" },
        fitSignals: { type: "array", items: { type: "string" } },
        gaps: { type: "array", items: { type: "string" } },
      },
      required: ["vertical", "fitSignals", "gaps"],
    },
    scoreBreakdown: {
      type: "object",
      properties: {
        industry: { type: "number", minimum: 0, maximum: ICP_SCORE_WEIGHTS.industry },
        size: { type: "number", minimum: 0, maximum: ICP_SCORE_WEIGHTS.size },
        operations: { type: "number", minimum: 0, maximum: ICP_SCORE_WEIGHTS.operations },
        growth: { type: "number", minimum: 0, maximum: ICP_SCORE_WEIGHTS.growth },
        similarity: { type: "number", minimum: 0, maximum: ICP_SCORE_WEIGHTS.similarity },
      },
      required: ["industry", "size", "operations", "growth", "similarity"],
    },
  },
  required: ["icpScore", "priority", "reasoning", "painPoints", "industryAnalysis", "scoreBreakdown"],
} as const;

function buildSystemPrompt(org: OrgIdentity): string {
  return `You are the AI Qualification engine inside ${org.name}'s Sales Intelligence Platform (powered by Leadify).
${org.profile}

Score every prospect strictly against ${org.name}'s Ideal Customer Profile (ICP). Do not inflate scores -- a
company that does not match the ICP should score low even if it is large or well-known.

Always return your reasoning in plain, specific business language a sales rep can read aloud on a call.
Never fabricate facts about the company that are not present in the provided context; if information is
missing, note it as a gap in industryAnalysis.gaps rather than guessing.`;
}

export function buildQualificationPrompt(
  org: OrgIdentity,
  company: Company,
  similarClientSummaries: string[],
): { system: string; userPrompt: string } {
  const userPrompt = `## Ideal Customer Profile Criteria

Target industries: ${ICP_TARGET_INDUSTRIES.join(", ")}
Size: ${ICP_SIZE_THRESHOLDS.minEmployees}+ employees OR ₹${ICP_SIZE_THRESHOLDS.minRevenueInrCr} Cr+ revenue
Operations: ${ICP_OPERATIONS_THRESHOLDS.minCities}+ cities, ${ICP_OPERATIONS_THRESHOLDS.minVehicles}+ vehicles, warehouse network, active delivery operations, currently uses outsourced logistics

Score weighting (must sum to 100): industry=${ICP_SCORE_WEIGHTS.industry}, size=${ICP_SCORE_WEIGHTS.size}, operations=${ICP_SCORE_WEIGHTS.operations}, growth=${ICP_SCORE_WEIGHTS.growth}, similarity=${ICP_SCORE_WEIGHTS.similarity}

## Prospect Company

Name: ${company.name}
Industry: ${company.industry ?? "unknown"}
Employee count: ${company.employeeCount ?? "unknown"}
Estimated revenue: ${company.revenueInrCr ? `₹${company.revenueInrCr} Cr` : "unknown"}
Cities of operation: ${company.citiesCount ?? "unknown"}
Estimated fleet size: ${company.fleetSizeEstimate ?? "unknown"}
Additional metadata: ${JSON.stringify(company.metadata ?? {})}

## Reference: Existing ${org.name} Clients (for similarity dimension)

${similarClientSummaries.length > 0 ? similarClientSummaries.join("\n") : "No similarity matches available yet."}

Return your qualification using the qualify_company tool.`;

  return { system: buildSystemPrompt(org), userPrompt };
}
