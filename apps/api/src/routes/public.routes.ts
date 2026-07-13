import { Router } from "express";
import rateLimit from "express-rate-limit";
import { createDemoRequestSchema, requestOtpSchema } from "@bluwheelz/shared";
import { validate } from "../middleware/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { demoRequestsRepository } from "../repositories/demoRequestsRepository.js";
import { usersRepository } from "../repositories/usersRepository.js";
import { organizationsRepository } from "../repositories/organizationsRepository.js";
import { notificationsRepository } from "../repositories/notificationsRepository.js";
import { supabaseAdmin } from "../config/supabase.js";
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

/** Keyed by IP + email so one abusive email can't exhaust another visitor's quota (and vice versa). */
const otpRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip ?? "anonymous"}:${String(req.body?.email ?? "").toLowerCase()}`,
  message: {
    error: { code: "RATE_LIMITED", message: "Too many sign-in codes requested. Please wait before trying again." },
  },
});

/**
 * Best-effort, fire-and-forget lookup + send. Always called AFTER the
 * response is already sent so the response timing can't be used to probe
 * which emails have an account (account-enumeration protection).
 *
 * OTP email is sent by Supabase Auth over HTTPS (Render free blocks SMTP).
 * For a numeric code (not a magic link), the Magic Link email template in
 * Supabase must include {{ .Token }} — see apps/api/.env.example.
 */
async function sendOtpIfEligible(email: string): Promise<void> {
  const user = await usersRepository.findByEmail(email);
  if (!user || !user.isActive) {
    logger.info({ email }, "OTP request ignored: no active user for this email");
    return;
  }

  const org = await organizationsRepository.findById(user.organizationId);
  if (org && org.isActive === false && user.role !== "super_admin") {
    logger.info({ email, organizationId: user.organizationId }, "OTP request ignored: organization is disabled");
    return;
  }

  // Invite-only: never create Auth users from the public login form.
  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    logger.warn({ err: error, email }, "Failed to send OTP via Supabase Auth");
    return;
  }
  logger.info({ email }, "OTP email requested via Supabase Auth");
}

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

publicRouter.post(
  "/auth/otp/request",
  otpRateLimit,
  validate(requestOtpSchema),
  asyncHandler(async (req, res) => {
    const email = (req.body.email as string).toLowerCase();

    // Respond immediately, before the lookup, so response timing can't leak
    // whether this email has an account.
    res.json({ data: { sent: true } });

    sendOtpIfEligible(email).catch((err) => {
      logger.warn({ err, email }, "Failed to send OTP code");
    });
  }),
);
