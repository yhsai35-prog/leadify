import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/errors.js";

/**
 * Verifies the `X-Leadify-Signature` header n8n attaches to every webhook
 * call: HMAC-SHA256 of the raw JSON body, keyed with N8N_WEBHOOK_SECRET.
 * Requires `express.json({ verify })` to have captured `req.rawBody` (see
 * src/index.ts) since re-serializing the parsed body can produce a
 * byte-for-byte different string and break the signature check.
 * The legacy `X-Bluwheelz-Signature` header is accepted for existing n8n
 * workflow deployments that haven't been re-imported yet.
 */
export function requireN8nSignature(req: Request, _res: Response, next: NextFunction) {
  const signature = req.headers["x-leadify-signature"] ?? req.headers["x-bluwheelz-signature"];
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (typeof signature !== "string" || !rawBody) {
    throw ApiError.unauthorized("Missing webhook signature");
  }

  const expected = crypto.createHmac("sha256", env.N8N_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const provided = Buffer.from(signature, "hex");
  const computed = Buffer.from(expected, "hex");

  if (provided.length !== computed.length || !crypto.timingSafeEqual(provided, computed)) {
    throw ApiError.unauthorized("Invalid webhook signature");
  }
  next();
}

/** Guards internal endpoints (job worker tick, scheduled-send poller) invoked by n8n cron or Railway cron. */
export function requireInternalServiceKey(req: Request, _res: Response, next: NextFunction) {
  const key = req.headers["x-internal-service-key"];
  if (key !== env.INTERNAL_SERVICE_KEY) {
    throw ApiError.unauthorized("Invalid internal service key");
  }
  next();
}
