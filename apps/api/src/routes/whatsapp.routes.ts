import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { whatsappTemplatesService } from "../services/whatsapp/whatsappWebhookService.js";
import { isWhatsAppConfigured } from "../services/whatsapp/metaWhatsAppClient.js";

export const whatsappRouter = Router();
whatsappRouter.use(requireAuth);

whatsappRouter.get(
  "/status",
  requireRole("user"),
  asyncHandler(async (_req, res) => {
    res.json({
      data: {
        configured: isWhatsAppConfigured(),
      },
    });
  }),
);

whatsappRouter.get(
  "/templates",
  requireRole("user"),
  asyncHandler(async (req, res) => {
    const templates = await whatsappTemplatesService.list(req.user!.organizationId);
    res.json({ data: templates });
  }),
);

whatsappRouter.post(
  "/templates/sync",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const templates = await whatsappTemplatesService.sync(req.user!.organizationId);
    res.json({ data: templates });
  }),
);
