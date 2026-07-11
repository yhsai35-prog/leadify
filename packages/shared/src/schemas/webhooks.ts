import { z } from "zod";
import { uuidSchema } from "./common.js";

export const emailSentWebhookSchema = z.object({
  emailId: uuidSchema,
  gmailMessageId: z.string(),
  gmailThreadId: z.string(),
  sentAt: z.string().datetime(),
});
export type EmailSentWebhookInput = z.infer<typeof emailSentWebhookSchema>;

export const emailSendFailedWebhookSchema = z.object({
  emailId: uuidSchema,
  error: z.string(),
});
export type EmailSendFailedWebhookInput = z.infer<typeof emailSendFailedWebhookSchema>;

export const replyReceivedWebhookSchema = z.object({
  gmailThreadId: z.string(),
  fromEmail: z.string().email(),
  bodySnippet: z.string(),
  receivedAt: z.string().datetime(),
});
export type ReplyReceivedWebhookInput = z.infer<typeof replyReceivedWebhookSchema>;
