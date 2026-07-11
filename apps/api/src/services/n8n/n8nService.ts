import type { Email } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/errors.js";

/**
 * Sole entry point from the API into n8n. `triggerSend` is deliberately the
 * ONLY function in this file that can cause an email to leave the system --
 * every caller of it (see ApprovalService.approve / dispatchScheduledEmails)
 * must have already verified `emails.status === 'approved'` and
 * `approved_by is not null` before calling this.
 */
export const n8nService = {
  async triggerSend(email: Email, contactEmail: string, fromMailboxUserId: string): Promise<void> {
    const response = await fetch(`${env.N8N_BASE_URL}/webhook/trigger-email-send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.N8N_API_KEY}`,
      },
      body: JSON.stringify({
        emailId: email.id,
        leadId: email.leadId,
        to: contactEmail,
        subject: email.subject,
        bodyHtml: email.bodyHtml,
        fromMailboxUserId,
        callbackBaseUrl: env.API_BASE_URL,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error({ status: response.status, body }, "n8n send trigger failed");
      throw ApiError.internal("Failed to trigger the send workflow in n8n");
    }
  },
};
