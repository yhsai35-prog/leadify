import rateLimit from "express-rate-limit";

/** General API traffic: 100 requests/minute per authenticated user (falls back to IP). */
export const standardRateLimit = rateLimit({
  windowMs: 60 * 1000,
  // Dashboard fires many parallel analytics queries; 100/min is easy to burn
  // on a single page load with retries, especially after conditional GETs.
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
});

/** AI-invoking endpoints (qualify, research, generate email, copilot) are far more expensive. */
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? "anonymous",
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many AI requests. Please wait a moment before trying again.",
    },
  },
});
