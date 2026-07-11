import type { Request, Response } from "express";
import type { AiUsageQuery } from "@bluwheelz/shared";
import { asyncHandler } from "../utils/asyncHandler.js";
import { aiUsageService } from "../services/aiUsage/aiUsageService.js";

export const aiUsageController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as unknown as AiUsageQuery;
    const data = await aiUsageService.summary(req.user!.organizationId, from, to);
    res.json({ data });
  }),

  byUser: asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as unknown as AiUsageQuery;
    const data = await aiUsageService.byUser(req.user!.organizationId, from, to);
    res.json({ data });
  }),
};
