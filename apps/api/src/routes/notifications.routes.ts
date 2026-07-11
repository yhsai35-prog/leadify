import { Router } from "express";
import { notificationsController } from "../controllers/notificationsController.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", notificationsController.list);
notificationsRouter.patch("/:id/read", notificationsController.markRead);
