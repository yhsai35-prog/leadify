import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { qualificationService } from "../services/qualification/qualificationService.js";

export const qualificationController = {
  qualify: asyncHandler(async (req: Request, res: Response) => {
    const score = await qualificationService.qualifyLead(req.params.id as string, req.user!.id);
    res.status(201).json({ data: score });
  }),

  history: asyncHandler(async (req: Request, res: Response) => {
    const scores = await qualificationService.getScoreHistory(req.params.id as string);
    res.json({ data: scores });
  }),

  latest: asyncHandler(async (req: Request, res: Response) => {
    const score = await qualificationService.getLatestScore(req.params.id as string);
    res.json({ data: score });
  }),
};
