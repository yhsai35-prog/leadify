import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.use(requireAuth);
authRouter.get("/me", authController.me);
