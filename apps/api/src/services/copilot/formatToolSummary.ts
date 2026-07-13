import type { CopilotNotification } from "@bluwheelz/shared";

type LeadSearchResult = {
  id?: string;
  company?: string | null;
  industry?: string | null;
  status?: string;
  priority?: string;
  icpScore?: number | null;
};

export type ToolSummaryResult = {
  content: string;
  toolInput: Record<string, unknown>;
  notification?: CopilotNotification;
  resultCount: number;
};

function describeFilters(input: Record<string, unknown>): string {
  const parts: string[] = [];
  if (input.companyName) parts.push(`company = "${input.companyName}"`);
  if (input.industry) parts.push(`industry = "${input.industry}"`);
  if (input.priority) parts.push(`priority = ${input.priority}`);
  if (input.pipelineStatus) parts.push(`pipeline status = ${input.pipelineStatus}`);
  if (input.search) parts.push(`company name contains "${input.search}"`);
  if (input.clientName) parts.push(`similar to client "${input.clientName}"`);
  if (input.leadId) parts.push(`lead ID ${input.leadId}`);
  if (input.query) parts.push(`query = "${input.query}"`);
  return parts.length > 0 ? parts.join(", ") : "no filters applied";
}

function formatLeadRows(rows: LeadSearchResult[], max = 8): string {
  if (rows.length === 0) return "";
  const lines = rows.slice(0, max).map((r) => {
    const score = r.icpScore != null ? `ICP ${r.icpScore}` : "not scored yet";
    const industry = r.industry ?? "industry unknown";
    return `• ${r.company ?? "Unknown company"} — ${industry}, ${r.priority ?? "medium"} priority, ${score}`;
  });
  const extra = rows.length > max ? `\n…plus ${rows.length - max} more` : "";
  return `${lines.join("\n")}${extra}`;
}

export function formatToolSummary(
  name: string,
  input: Record<string, unknown>,
  output: unknown,
): ToolSummaryResult {
  const filters = describeFilters(input);
  const cleanInput = Object.fromEntries(Object.entries(input).filter(([, v]) => v != null && v !== ""));

  if (output && typeof output === "object" && "error" in (output as object)) {
    const errorMsg = (output as { error: string }).error;
    const isSoft =
      errorMsg.includes("not been qualified") ||
      errorMsg.includes("not found") ||
      errorMsg.includes("No existing client");
    return {
      content: `Could not complete lookup (${filters}): ${errorMsg}`,
      toolInput: cleanInput,
      resultCount: 0,
      notification: {
        variant: isSoft ? "info" : "error",
        title: isSoft ? "No data available" : "Lookup failed",
        description: errorMsg,
      },
    };
  }

  switch (name) {
    case "analyze_company": {
      const result = output as {
        notFound?: boolean;
        companyName?: string;
        ambiguous?: boolean;
        candidates?: { name: string; industry?: string | null }[];
        company?: { name: string };
        qualification?: { icpScore?: number } | null;
      };

      if (result.notFound) {
        const name = result.companyName ?? (input.companyName as string) ?? "This company";
        return {
          content: `${name} is not in your pipeline.`,
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "Company not in pipeline",
            description: `${name} was not found. Search and import it from Lead Discovery.`,
          },
        };
      }

      if (result.ambiguous && result.candidates?.length) {
        const names = result.candidates.map((c) => c.name).join(", ");
        return {
          content: `Multiple companies matched: ${names}. Ask the user to clarify which one.`,
          toolInput: cleanInput,
          resultCount: result.candidates.length,
          notification: {
            variant: "info",
            title: "Multiple matches found",
            description: `Found: ${names}. Please specify which company you mean.`,
          },
        };
      }

      const companyName = result.company?.name ?? "Company";
      const qualified = result.qualification?.icpScore != null;
      return {
        content: `Loaded full brief for ${companyName}${qualified ? ` (ICP ${result.qualification!.icpScore})` : " (not qualified yet)"}.`,
        toolInput: cleanInput,
        resultCount: 1,
        notification: qualified
          ? undefined
          : {
              variant: "info",
              title: `${companyName} — not qualified yet`,
              description: "Run ICP qualification on the lead page to unlock score, pain points, and outreach angles.",
            },
      };
    }

    case "search_leads": {
      const rows = (Array.isArray(output) ? output : []) as LeadSearchResult[];
      if (rows.length === 0) {
        return {
          content: `Pipeline search returned 0 leads.\nFilters used: ${filters}.`,
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "No companies found",
            description: `No leads matched (${filters}). Import companies from Lead Discovery if this industry is not in your pipeline yet.`,
          },
        };
      }
      return {
        content: `Found ${rows.length} lead(s).\nFilters: ${filters}.\n${formatLeadRows(rows)}`,
        toolInput: cleanInput,
        resultCount: rows.length,
      };
    }

    case "get_top_scored_leads": {
      const rows = (Array.isArray(output) ? output : []) as LeadSearchResult[];
      if (rows.length === 0) {
        const industryNote = input.industry ? ` for industry "${input.industry}"` : "";
        return {
          content: `No ranked leads found${industryNote}.`,
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "No ranked leads",
            description: `No qualified leads found${industryNote}. Import and run ICP qualification first.`,
          },
        };
      }
      return {
        content: `Top ${rows.length} lead(s) by ICP score & priority:\n${formatLeadRows(rows)}`,
        toolInput: cleanInput,
        resultCount: rows.length,
      };
    }

    case "get_lead_detail": {
      const detail = output as {
        lead?: { company?: { name?: string }; pipelineStatus?: string; priority?: string };
        latestScore?: { icpScore?: number };
      };
      const company = detail.lead?.company?.name ?? "Unknown";
      const score = detail.latestScore?.icpScore;
      return {
        content: `Lead detail for ${company} — status: ${detail.lead?.pipelineStatus ?? "n/a"}, priority: ${detail.lead?.priority ?? "n/a"}${score != null ? `, ICP ${score}` : ", not qualified yet"}.`,
        toolInput: cleanInput,
        resultCount: 1,
      };
    }

    case "find_similar_to_client": {
      const rows = (Array.isArray(output) ? output : []) as { company?: string; similarityPct?: number }[];
      if (rows.length === 0) {
        return {
          content: `No similar prospects found (${filters}).`,
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "No similar prospects",
            description: `No pipeline leads matched ${filters}. Import prospects and run similarity analysis first.`,
          },
        };
      }
      const lines = rows.map((r) => `• ${r.company ?? "Unknown"} — ${r.similarityPct ?? 0}% match`);
      return {
        content: `Similar prospects (${filters}):\n${lines.join("\n")}`,
        toolInput: cleanInput,
        resultCount: rows.length,
      };
    }

    case "explain_score": {
      const score = output as { icpScore?: number; reasoning?: string };
      if (!score.icpScore && !score.reasoning) {
        return {
          content: "This lead has not been qualified yet.",
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "Not qualified yet",
            description: "Run ICP qualification on the lead page to generate a score and reasoning.",
          },
        };
      }
      return {
        content: `ICP score: ${score.icpScore ?? "n/a"}${score.reasoning ? `\nReasoning: ${score.reasoning}` : ""}`,
        toolInput: cleanInput,
        resultCount: 1,
      };
    }

    case "generate_email_draft": {
      const draft = output as { subject?: string; status?: string; note?: string };
      return {
        content: `Draft created — subject: "${draft.subject ?? "n/a"}", status: ${draft.status ?? "pending"}.\n${draft.note ?? ""}`,
        toolInput: cleanInput,
        resultCount: 1,
        notification: {
          variant: "success",
          title: "Draft created",
          description: "Outreach draft is pending approval before it can be sent.",
        },
      };
    }

    case "search_knowledge_base": {
      const articles = (Array.isArray(output) ? output : []) as { title?: string; category?: string }[];
      if (articles.length === 0) {
        return {
          content: `No knowledge base content found (${filters}).`,
          toolInput: cleanInput,
          resultCount: 0,
          notification: {
            variant: "info",
            title: "No knowledge base matches",
            description: `Nothing in the knowledge base matched "${input.query ?? ""}". Answer from general knowledge if appropriate, or suggest adding this to the knowledge base.`,
          },
        };
      }
      const lines = articles.map((a) => `• ${a.title ?? "Untitled"} (${a.category ?? "General"})`);
      return {
        content: `Searched the knowledge base for "${input.query ?? ""}". Found:\n${lines.join("\n")}`,
        toolInput: cleanInput,
        resultCount: articles.length,
        notification: {
          variant: "success",
          title: "Searched the knowledge base",
          description: `Found ${articles.length} relevant article(s) for "${input.query ?? ""}".`,
        },
      };
    }

    default:
      return { content: `Completed ${name}.`, toolInput: cleanInput, resultCount: 0 };
  }
}
