import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createDemoRequestSchema } from "@bluwheelz/shared";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { demoRequestsRepository } from "../repositories/demoRequestsRepository.js";
import { usersRepository } from "../repositories/usersRepository.js";
import { notificationsRepository } from "../repositories/notificationsRepository.js";
import { logger } from "../config/logger.js";

/** Unauthenticated landing-page endpoints. Aggressively rate limited by IP. */
const publicRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "anonymous",
  message: {
    error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
  },
});

export const publicRouter = Router();

publicRouter.post(
  "/demo-requests",
  publicRateLimit,
  validate(createDemoRequestSchema),
  asyncHandler(async (req, res) => {
    const request = await demoRequestsRepository.create(req.body);

    // Best-effort: a failed notification must not fail the public submission.
    try {
      const superAdmins = await usersRepository.listSuperAdmins();
      await notificationsRepository.createForUsers(
        superAdmins.map((u) => u.id),
        "demo_request",
        { demoRequestId: request.id, name: request.name, email: request.email, company: request.company },
      );
    } catch (err) {
      logger.warn({ err }, "Demo request saved but super admin notification failed");
    }

    res.status(201).json({ data: { id: request.id } });
  }),
);
