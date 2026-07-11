import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { meetingsRepository } from "../repositories/meetingsRepository.js";
import { activitiesRepository } from "../repositories/activitiesRepository.js";

export const meetingsController = {
  listForLead: asyncHandler(async (req: Request, res: Response) => {
    const meetings = await meetingsRepository.listByLead(req.params.id as string);
    res.json({ data: meetings });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const leadId = req.params.id as string;
    const meeting = await meetingsRepository.create({ leadId, outcome: "scheduled", ...req.body });
    await activitiesRepository.log({ leadId, userId: req.user!.id, type: "meeting_scheduled", payload: { meetingId: meeting.id } });
    res.status(201).json({ data: meeting });
  }),
};
