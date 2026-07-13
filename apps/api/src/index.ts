import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { standardRateLimit } from "./middleware/rateLimit.js";
import { startJobProcessorLoop } from "./jobs/jobProcessor.js";
import { reminderService } from "./services/reminders/reminderService.js";
import { mailerService } from "./services/mailer/mailerService.js";

const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
const serveWeb = env.NODE_ENV === "production" && fs.existsSync(webDist);
const supabaseHost = new URL(env.SUPABASE_URL).host;

const app = express();

// API responses are JSON payloads hydrated client-side; conditional GETs (304)
// return empty bodies and break the SPA fetch client.
app.set("etag", false);

app.use(
  helmet({
    contentSecurityPolicy: serveWeb
      ? {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", env.SUPABASE_URL, `wss://${supabaseHost}`, "https://*.supabase.co", "wss://*.supabase.co"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "https:", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https:", "data:"],
            formAction: ["'self'"],
            frameAncestors: ["'self'"],
          },
        }
      : true,
  }),
);
app.use(cors({ origin: env.WEB_APP_URL, credentials: true }));
app.use(compression());
app.use(pinoHttp({ logger }));

// Webhook routes need the raw request body to verify the HMAC signature
// (see middleware/webhookAuth.ts), so we capture it during JSON parsing
// instead of re-serializing the parsed body later.
app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  }),
);

app.use("/v1", standardRateLimit, apiRouter);

app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    mailConfigured: mailerService.isConfigured(),
    mailProvider: mailerService.provider(),
  }),
);

if (serveWeb) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/v1") || req.path === "/health") return next();
    res.sendFile(path.join(webDist, "index.html"), (err) => (err ? next(err) : undefined));
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Leadify API listening on port ${env.PORT} (${env.NODE_ENV})`);
  const provider = mailerService.provider();
  if (provider === "none") {
    logger.warn("No mail provider — set RESEND_API_KEY (Render) or SMTP_* (local) for OTP emails");
  } else {
    logger.info({ provider }, "Transactional mail configured for OTP / reminders");
  }
});

// Fallback in-process poller for local development / single-instance
// deployments. In production, prefer the `/internal/jobs/process` and
// `/internal/reminders/process` endpoints driven by Railway/n8n cron so
// background processing scales independently of the web process (see
// docs/architecture.md Background Jobs section).
if (env.NODE_ENV !== "production") {
  startJobProcessorLoop();
  setInterval(() => {
    reminderService.processDueReminders().catch((err) => logger.error({ err }, "Reminder tick failed"));
  }, 60_000);
}
