import { Router } from "express";
import { emailSendFailedWebhookSchema, emailSentWebhookSchema, replyReceivedWebhookSchema } from "@bluwheelz/shared";
import { webhooksController } from "../controllers/webhooksController.js";
import { requireN8nSignature } from "../middleware/webhookAuth.js";
import { validate } from "../middleware/validate.js";

export const webhooksRouter = Router();
webhooksRouter.use(requireN8nSignature);

webhooksRouter.post("/n8n/email-sent", validate(emailSentWebhookSchema), webhooksController.emailSent);
webhooksRouter.post("/n8n/send-failed", validate(emailSendFailedWebhookSchema), webhooksController.sendFailed);
webhooksRouter.post("/n8n/reply-received", validate(replyReceivedWebhookSchema), webhooksController.replyReceived);
