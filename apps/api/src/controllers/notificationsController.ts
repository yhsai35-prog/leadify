import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notificationsRepository } from "../repositories/notificationsRepository.js";

export const notificationsController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const notifications = await notificationsRepository.listForUser(req.user!.id);
    res.json({ data: notifications });
  }),

  markRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationsRepository.markRead(req.params.id as string);
    res.status(204).send();
  }),
};
