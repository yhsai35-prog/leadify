import {
  ReplySentiment,
  type EmailSendFailedWebhookInput,
  type EmailSentWebhookInput,
  type ReplyReceivedWebhookInput,
} from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { callClaudeStructured } from "../claude/client.js";
import {
  REPLY_CLASSIFICATION_TOOL_SCHEMA,
  buildReplyClassificationPrompt,
} from "../claude/prompts/replyClassification.prompt.js";
import { emailsRepository } from "../../repositories/emailsRepository.js";
import { emailRepliesRepository } from "../../repositories/emailRepliesRepository.js";
import { activitiesRepository } from "../../repositories/activitiesRepository.js";
import { pipelineService } from "../pipeline/pipelineService.js";
import { ApiError } from "../../utils/errors.js";
import { z } from "zod";

const replyClassificationResultSchema = z.object({
  sentiment: z.nativeEnum(ReplySentiment),
  suggestedAction: z.string(),
  summary: z.string(),
});

/**
 * Handles the three inbound webhooks n8n calls back into the API (see
 * n8n/workflows/*.json). This is the only place `leads.pipeline_status`
 * is set to `sent` -- confirming the human-in-the-loop invariant that the
 * platform never marks something sent until Gmail actually delivered it.
 */
export const n8nWebhookService = {
  async handleEmailSent(input: EmailSentWebhookInput): Promise<void> {
    const email = await emailsRepository.findById(input.emailId);
    if (!email) throw ApiError.notFound("Email not found for send confirmation");

    await emailsRepository.update(input.emailId, {
      status: "sent",
      sentAt: input.sentAt,
      gmailMessageId: input.gmailMessageId,
      gmailThreadId: input.gmailThreadId,
    });
    await pipelineService.transitionToSentFromWebhook(email.leadId);
    await activitiesRepository.log({ leadId: email.leadId, userId: null, type: "sent", payload: { emailId: email.id } });
  },

  async handleSendFailed(input: EmailSendFailedWebhookInput): Promise<void> {
    const email = await emailsRepository.findById(input.emailId);
    if (!email) throw ApiError.notFound("Email not found for send failure");

    await emailsRepository.update(input.emailId, { status: "failed" });
    await activitiesRepository.log({
      leadId: email.leadId,
      userId: null,
      type: "send_failed",
      payload: { emailId: email.id, error: input.error },
    });
  },

  async handleReplyReceived(input: ReplyReceivedWebhookInput): Promise<void> {
    const email = await emailsRepository.findByGmailThreadId(input.gmailThreadId);
    if (!email) throw ApiError.notFound("No email found for this Gmail thread");

    const { system, userPrompt } = buildReplyClassificationPrompt(input.bodySnippet);
    const { result } = await callClaudeStructured({
      model: env.CLAUDE_MODEL_COPILOT,
      system,
      userPrompt,
      toolName: "classify_reply",
      toolDescription: "Classify the sentiment of this email reply",
      toolInputSchema: REPLY_CLASSIFICATION_TOOL_SCHEMA,
      parse: (raw) => replyClassificationResultSchema.parse(raw),
    });

    await emailRepliesRepository.create({
      emailId: email.id,
      fromEmail: input.fromEmail,
      bodySnippet: input.bodySnippet,
      sentiment: result.sentiment,
      suggestedAction: result.suggestedAction,
      receivedAt: input.receivedAt,
    });

    await activitiesRepository.log({
      leadId: email.leadId,
      userId: null,
      type: "reply_received",
      payload: { emailId: email.id, sentiment: result.sentiment, summary: result.summary },
    });

    // Sentiment only informs a suggestion; a human still decides whether to
    // advance the pipeline (see the "manager confirms" step in the Reply
    // Tracking Workflow section of docs/architecture.md).
  },
};
