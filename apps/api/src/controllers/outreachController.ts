import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { outreachService } from "../services/outreach/outreachService.js";

export const outreachController = {
  generate: asyncHandler(async (req: Request, res: Response) => {
    const { contactId, type, tone } = req.body;
    const email = await outreachService.generateEmail(req.params.id as string, contactId, type, tone, req.user!.id);
    res.status(201).json({ data: email });
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const emails = await outreachService.listEmailsForLead(req.params.id as string);
    res.json({ data: emails });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const email = await outreachService.updateDraft(req.params.id as string, req.body);
    res.json({ data: email });
  }),

  regenerate: asyncHandler(async (req: Request, res: Response) => {
    const email = await outreachService.regenerateEmail(req.params.id as string, req.user!.id);
    res.status(201).json({ data: email });
  }),
};
