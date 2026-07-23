import { Router } from "express";
import { whatsappWebhookService } from "../services/whatsapp/whatsappWebhookService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const whatsappWebhooksRouter = Router();

whatsappWebhooksRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    whatsappWebhookService.verifyChallenge(req, res);
  }),
);

whatsappWebhooksRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    await whatsappWebhookService.handleInbound(req, res);
  }),
);
