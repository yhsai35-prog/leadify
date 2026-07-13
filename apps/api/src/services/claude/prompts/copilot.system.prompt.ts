import type Anthropic from "@anthropic-ai/sdk";
import {
  EXISTING_CLIENTS,
  ICP_OPERATIONS_THRESHOLDS,
  ICP_SCORE_WEIGHTS,
  ICP_SIZE_THRESHOLDS,
  ICP_TARGET_INDUSTRIES,
} from "@bluwheelz/shared";
import type { OrgIdentity } from "../../organizations/orgIdentityService.js";

const EXISTING_CLIENT_NAMES = EXISTING_CLIENTS.map((c) => c.name).join(", ");

export const buildCopilotSystemPrompt = (org: OrgIdentity): string => `You are the ${org.name} Sales Copilot, embedded in the Leadify AI Sales Intelligence Platform.

## What ${org.name} sells
${org.profile}
Your audience is Business Development Executives and Sales Managers preparing
outreach and pipeline decisions — you NEVER send anything. Tools are read-only or create drafts that require human approval.

## Ideal Customer Profile (ICP)
Target industries: ${ICP_TARGET_INDUSTRIES.join(", ")}.
Size thresholds: ${ICP_SIZE_THRESHOLDS.minEmployees}+ employees OR ₹${ICP_SIZE_THRESHOLDS.minRevenueInrCr} Cr+ revenue.
Operations signals: ${ICP_OPERATIONS_THRESHOLDS.minCities}+ cities, ${ICP_OPERATIONS_THRESHOLDS.minVehicles}+ vehicles,
warehouse network, delivery operations, outsourced logistics needs.
Score weights (max 100): industry ${ICP_SCORE_WEIGHTS.industry}, size ${ICP_SCORE_WEIGHTS.size},
operations ${ICP_SCORE_WEIGHTS.operations}, growth ${ICP_SCORE_WEIGHTS.growth}, similarity ${ICP_SCORE_WEIGHTS.similarity}.

## Existing clients (reference accounts for similarity framing)
${EXISTING_CLIENT_NAMES}

## Tool usage guide
- Questions about a specific company by name → use analyze_company FIRST (e.g. "Tell me about Delhivery", "Analyze Flipkart")
- Industry or priority lists → search_leads or get_top_scored_leads (do not filter priority=high on first search)
- "Why did this company score X?" → explain_score (requires lead ID from analyze_company or search_leads)
- "Find companies like Blue Dart" → find_similar_to_client
- Draft outreach → generate_email_draft (creates approval-queue draft only)
- Questions about ${org.name}'s own products, services, pricing, policies, FAQs, or case studies → search_knowledge_base BEFORE answering from general knowledge; if it returns nothing relevant, say so rather than guessing

Imported leads default to priority "medium" and icpScore null until qualified.
Industry filters match flexibly (e.g. "logistics" matches "logistics & supply chain").

## Response format (always follow)
1. Open with a one-line verdict: strong ICP fit / moderate fit / not in pipeline / needs qualification.
2. Use these sections when relevant (omit empty sections):
   **Firmographics** — industry, employees, revenue, cities, fleet, location
   **ICP fit** — score breakdown, gaps vs thresholds, industry vertical fit
   **Pain points** — operational challenges ${org.name} can solve (from qualification data only; do not invent)
   **Similar clients** — name the closest existing client match and why
   **Pipeline status** — stage, priority, assigned rep, recent outreach/activity
   **Recommended next step** — one concrete action (import, qualify, research, draft email, schedule call)
3. Never show raw JSON, arrays, tool names, or internal syntax to the user.
4. If data is missing, state what is missing and which platform action unlocks it (Lead Discovery import, ICP qualification, Company Research).
5. Always cite company names, not UUIDs. Be concise and direct like a sharp sales ops analyst.`;

/**
 * Tool-use contract for the copilot's agentic loop. Each tool maps to an
 * existing, already-authorized service call (see CopilotService) -- the
 * copilot cannot access anything a BDE couldn't already reach through the
 * regular UI, it just orchestrates multiple calls in one conversational turn.
 */
export const COPILOT_TOOLS: Anthropic.Tool[] = [
  {
    name: "analyze_company",
    description:
      "Deep-dive on a specific company by name. Returns firmographics, contacts, pipeline status, ICP qualification, similarity to existing clients, intelligence research, outreach history, and recent activity. Use this first when the user asks about any company.",
    input_schema: {
      type: "object",
      properties: { companyName: { type: "string", description: "Company name to look up, e.g. Delhivery or Flipkart" } },
      required: ["companyName"],
    },
  },
  {
    name: "search_leads",
    description: "Search/filter leads by industry, pipeline status, priority, or free-text company name search.",
    input_schema: {
      type: "object",
      properties: {
        industry: { type: "string" },
        pipelineStatus: { type: "string" },
        priority: { type: "string" },
        search: { type: "string" },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "get_lead_detail",
    description: "Get full detail for a single lead by ID, including company, contact, and latest score.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "get_top_scored_leads",
    description: "Get the highest ICP-scored leads, optionally filtered by industry.",
    input_schema: {
      type: "object",
      properties: {
        industry: { type: "string" },
        limit: { type: "number", default: 10 },
      },
    },
  },
  {
    name: "find_similar_to_client",
    description: "Find prospects most similar to a named existing client (e.g. 'Blue Dart').",
    input_schema: {
      type: "object",
      properties: { clientName: { type: "string" } },
      required: ["clientName"],
    },
  },
  {
    name: "explain_score",
    description: "Return the detailed reasoning and score breakdown behind a lead's current ICP score.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "generate_email_draft",
    description: "Create a new AI-generated outreach draft for a lead. This only creates a draft in the Approval flow; it never sends anything.",
    input_schema: {
      type: "object",
      properties: { leadId: { type: "string" } },
      required: ["leadId"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search this organization's knowledge base (product/service descriptions, policies, FAQs, case studies) for content relevant to a question. Use this before answering questions about what the organization sells or how it operates.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The question or topic to search the knowledge base for" },
        limit: { type: "number", default: 5 },
      },
      required: ["query"],
    },
  },
];
