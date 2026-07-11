import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runJobProcessorTick } from "../jobs/jobProcessor.js";
import { approvalService } from "../services/approval/approvalService.js";
import { reminderService } from "../services/reminders/reminderService.js";

export const internalController = {
  processJobs: asyncHandler(async (_req: Request, res: Response) => {
    const processed = await runJobProcessorTick();
    res.json({ data: { processed } });
  }),

  dispatchScheduledEmails: asyncHandler(async (_req: Request, res: Response) => {
    const dispatched = await approvalService.dispatchScheduledEmails();
    res.json({ data: { dispatched } });
  }),

  processReminders: asyncHandler(async (_req: Request, res: Response) => {
    const processed = await reminderService.processDueReminders();
    res.json({ data: { processed } });
  }),
};
