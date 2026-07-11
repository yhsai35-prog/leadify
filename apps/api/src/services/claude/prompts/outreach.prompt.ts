import type { Company, Contact, LeadScore } from "@bluwheelz/shared";
import type { OrgIdentity } from "../../organizations/orgIdentityService.js";

export const OUTREACH_TOOL_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    emailBodyHtml: { type: "string" },
    emailBodyText: { type: "string" },
    linkedinMessage: { type: "string", description: "Under 300 characters, no subject line" },
    followUpEmail: { type: "string", description: "Plain text follow-up to send if no reply after 4-5 days" },
    callScript: { type: "string", description: "Talking points for a cold/warm call, 30-45 seconds when read aloud" },
  },
  required: ["subject", "emailBodyHtml", "emailBodyText", "linkedinMessage", "followUpEmail", "callScript"],
} as const;

function buildSystemPrompt(org: OrgIdentity): string {
  return `You are the Outreach Generator inside ${org.name}'s Sales Intelligence Platform (powered by Leadify).
${org.profile}

Write outreach that is professional, specific to the prospect's real operations, and never makes false or
unverifiable claims (no fake statistics, no pretending to have an existing relationship). Reference the
similar existing client naturally, as social proof, without overstating the similarity. Keep the initial
email under 150 words. The LinkedIn message must stand alone without the email's context.

This content will NEVER be sent automatically -- a human always reviews and approves it first. Write it as
a strong first draft that a Business Development Executive can send with minimal edits.`;
}

export function buildOutreachPrompt(
  org: OrgIdentity,
  company: Company,
  contact: Contact,
  score: LeadScore | null,
  similarClientName: string | null,
  similarityReason: string | null,
  tone: string,
): { system: string; userPrompt: string } {
  const userPrompt = `## Recipient

Name: ${contact.firstName} ${contact.lastName ?? ""}
Title: ${contact.title ?? "unknown"}
Company: ${company.name}

## Qualification Context

${score ? `ICP Score: ${score.icpScore}/100\nPain points identified: ${score.painPoints.join("; ")}\nReasoning: ${score.reasoning}` : "No qualification data available yet."}

## Similar Existing ${org.name} Client

${similarClientName ? `${similarClientName} -- ${similarityReason ?? "no reason provided"}` : "No similar client identified yet."}

## Tone

${tone}

Generate the full outreach package (email, LinkedIn message, follow-up, call script) using the generate_outreach tool.`;

  return { system: buildSystemPrompt(org), userPrompt };
}
