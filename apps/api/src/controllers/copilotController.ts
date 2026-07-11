import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { copilotService } from "../services/copilot/copilotService.js";

export const copilotController = {
  chat: asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;
    const messages = await copilotService.chat(req.user!, message, []);
    res.json({ data: messages });
  }),

  suggestions: asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      data: [
        "Analyze Delhivery — ICP fit and pain points",
        "Which logistics companies should we prioritize this week?",
        "How is Flipkart similar to our existing clients?",
        "Show highest priority logistics companies",
        "Find companies similar to Blue Dart",
        "Draft an email for my top prospect",
      ],
    });
  }),
};
