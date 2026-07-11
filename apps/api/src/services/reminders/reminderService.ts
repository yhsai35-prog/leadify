import { followUpRemindersRepository, type FollowUpReminder } from "../../repositories/followUpRemindersRepository.js";
import { notificationsRepository } from "../../repositories/notificationsRepository.js";
import { usersRepository } from "../../repositories/usersRepository.js";
import { leadsRepository } from "../../repositories/leadsRepository.js";
import { contactsRepository } from "../../repositories/contactsRepository.js";
import { mailerService } from "../mailer/mailerService.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

const FOLLOW_UP_DELAY_DAYS = 3;

/**
 * Follow-up nudges: when a user marks an email as sent (either the
 * self-reported acknowledgement checkbox or the manual Gmail confirm), a
 * reminder is scheduled for 3 days later. When due, the user gets an in-app
 * notification and an email to their account address.
 */
export const reminderService = {
  followUpDueAt(from = new Date()): string {
    return new Date(from.getTime() + FOLLOW_UP_DELAY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  },

  async scheduleFollowUp(input: {
    organizationId: string;
    userId: string;
    leadId?: string | null;
    contactId?: string | null;
    emailSubjectHint?: string | null;
  }): Promise<void> {
    try {
      await followUpRemindersRepository.create({ ...input, dueAt: this.followUpDueAt() });
    } catch (err) {
      // Reminders are a best-effort side effect; never fail the send/ack flow.
      logger.warn({ err, ...input }, "Failed to schedule follow-up reminder");
    }
  },

  async cancelFollowUp(userId: string, leadId: string, contactId: string): Promise<void> {
    try {
      await followUpRemindersRepository.deletePending(userId, leadId, contactId);
    } catch (err) {
      logger.warn({ err, userId, leadId, contactId }, "Failed to cancel follow-up reminder");
    }
  },

  /** Poller entry point (dev loop + /v1/internal/reminders/process cron). */
  async processDueReminders(): Promise<number> {
    const due = await followUpRemindersRepository.listDue(new Date().toISOString());
    for (const reminder of due) {
      try {
        await this.deliver(reminder);
      } catch (err) {
        logger.error({ err, reminderId: reminder.id }, "Failed to deliver follow-up reminder");
        continue;
      }
      await followUpRemindersRepository.markCompleted(reminder.id);
    }
    return due.length;
  },

  async deliver(reminder: FollowUpReminder): Promise<void> {
    const [user, lead, contact] = await Promise.all([
      usersRepository.findById(reminder.userId),
      reminder.leadId ? leadsRepository.findById(reminder.leadId) : Promise.resolve(null),
      reminder.contactId ? contactsRepository.findById(reminder.contactId) : Promise.resolve(null),
    ]);
    if (!user || !user.isActive) return;

    const companyName = lead?.company?.name ?? "a prospect";
    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
      : null;
    const who = contactName ? `${contactName} at ${companyName}` : companyName;

    await notificationsRepository.createForUsers([user.id], "follow_up_due", {
      reminderId: reminder.id,
      leadId: reminder.leadId,
      contactId: reminder.contactId,
      companyName: lead?.company?.name ?? null,
      contactName,
      emailSubjectHint: reminder.emailSubjectHint,
    });

    const subject = `Follow up with ${who}`;
    const daysAgo = FOLLOW_UP_DELAY_DAYS;
    const text = [
      `Hi ${user.fullName},`,
      "",
      `It has been ${daysAgo} days since you emailed ${who}${reminder.emailSubjectHint ? ` ("${reminder.emailSubjectHint}")` : ""} and a follow-up is due.`,
      "",
      reminder.leadId ? `Open the lead: ${env.WEB_APP_URL}/pipeline/${reminder.leadId}` : "",
      "",
      "— Leadify",
    ]
      .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
      .join("\n");

    await mailerService.send(user.email, subject, text);
  },
};
