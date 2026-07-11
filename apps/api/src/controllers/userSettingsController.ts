import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { userSettingsRepository } from "../repositories/userSettingsRepository.js";

export const userSettingsController = {
  getMySettings: asyncHandler(async (req: Request, res: Response) => {
    const settings = await userSettingsRepository.getByUserId(req.user!.id);
    res.json({ data: settings });
  }),

  updateMySettings: asyncHandler(async (req: Request, res: Response) => {
    const updated = await userSettingsRepository.updateByUserId(req.user!.id, req.body);
    res.json({ data: updated });
  }),
};
