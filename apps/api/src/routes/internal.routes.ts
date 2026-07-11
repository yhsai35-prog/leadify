import { Router } from "express";
import { internalController } from "../controllers/internalController.js";
import { requireInternalServiceKey } from "../middleware/webhookAuth.js";

export const internalRouter = Router();
internalRouter.use(requireInternalServiceKey);

internalRouter.post("/jobs/process", internalController.processJobs);
internalRouter.post("/emails/dispatch-scheduled", internalController.dispatchScheduledEmails);
internalRouter.post("/reminders/process", internalController.processReminders);
