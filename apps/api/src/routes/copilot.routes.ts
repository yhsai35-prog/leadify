import { Router } from "express";
import { copilotChatSchema } from "@bluwheelz/shared";
import { copilotController } from "../controllers/copilotController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { aiRateLimit } from "../middleware/rateLimit.js";

export const copilotRouter = Router();
copilotRouter.use(requireAuth, requireRole("user"));

copilotRouter.post("/chat", aiRateLimit, validate(copilotChatSchema), copilotController.chat);
copilotRouter.get("/suggestions", copilotController.suggestions);
