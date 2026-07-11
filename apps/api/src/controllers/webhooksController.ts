import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import { n8nWebhookService } from "../services/webhooks/n8nWebhookService.js";

export const webhooksController = {
  emailSent: asyncHandler(async (req: Request, res: Response) => {
    await n8nWebhookService.handleEmailSent(req.body);
    res.status(204).send();
  }),

  sendFailed: asyncHandler(async (req: Request, res: Response) => {
    await n8nWebhookService.handleSendFailed(req.body);
    res.status(204).send();
  }),

  replyReceived: asyncHandler(async (req: Request, res: Response) => {
    await n8nWebhookService.handleReplyReceived(req.body);
    res.status(204).send();
  }),
};
