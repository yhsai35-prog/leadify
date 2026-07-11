import { Router } from "express";
import { updateUserSettingsSchema } from "@bluwheelz/shared";
import { userSettingsController } from "../controllers/userSettingsController.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export const userSettingsRouter = Router();

userSettingsRouter.use(requireAuth);

userSettingsRouter.get("/me/settings", userSettingsController.getMySettings);
userSettingsRouter.patch("/me/settings", validate(updateUserSettingsSchema), userSettingsController.updateMySettings);
