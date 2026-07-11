import Anthropic from "@anthropic-ai/sdk";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/errors.js";
import { aiUsageRepository } from "../../repositories/aiUsageRepository.js";

export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface StructuredCallOptions<T> {
  model: string;
  system: string;
  userPrompt: string;
  /** Anthropic tool JSON schema describing the exact output shape we force the model to emit. */
  toolName: string;
  toolDescription: string;
  toolInputSchema: Record<string, unknown>;
  parse: (input: unknown) => T;
  maxTokens?: number;
  /** Org/user/action context for AI credit usage tracking (Super Admin AI Usage screen). */
  context?: { organizationId: string; userId?: string | null; action: string };
}

/**
 * Calls Claude with a single forced tool-use, guaranteeing the response is
 * valid JSON matching `toolInputSchema` instead of free-form text that would
 * need brittle parsing. `parse` should be a zod `.parse` call so malformed
 * output throws immediately rather than silently corrupting downstream data.
 *
 * We deliberately log only `promptHash` (sha256 of the user prompt), never
 * the prompt or response body, per the no-PII-in-logs rule in the AI Prompt
 * Architecture section of docs/architecture.md.
 */
export async function callClaudeStructured<T>(options: StructuredCallOptions<T>): Promise<{ result: T; promptHash: string }> {
  const promptHash = crypto.createHash("sha256").update(options.userPrompt).digest("hex").slice(0, 16);

  if (options.context) {
    try {
      aiUsageRepository.record(options.context.organizationId, options.context.userId, "claude", options.context.action);
    } catch (err) {
      logger.warn({ err, action: options.context.action }, "Failed to record Claude AI usage event");
    }
  }

  const response = await anthropic.messages.create({
    model: options.model,
    max_tokens: options.maxTokens ?? 4096,
    system: options.system,
    tools: [
      {
        name: options.toolName,
        description: options.toolDescription,
        input_schema: options.toolInputSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: options.toolName },
    messages: [{ role: "user", content: options.userPrompt }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === options.toolName,
  );

  if (!toolUse) {
    logger.error({ promptHash, stopReason: response.stop_reason }, "Claude did not return the expected tool call");
    throw ApiError.internal("AI response did not match the expected structured format");
  }

  try {
    const result = options.parse(toolUse.input);
    return { result, promptHash };
  } catch (err) {
    logger.error({ promptHash, err }, "Claude structured output failed schema validation");
    throw ApiError.internal("AI response failed validation");
  }
}
