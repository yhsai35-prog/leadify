import { Router } from "express";
import { actionQueueQuerySchema, analyticsQuerySchema } from "@bluwheelz/shared";
import { analyticsController } from "../controllers/analyticsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole("user"));

const query = validate(analyticsQuerySchema, "query");

analyticsRouter.get("/kpis", query, analyticsController.kpis);
analyticsRouter.get("/pipeline", query, analyticsController.pipeline);
analyticsRouter.get("/industries", query, analyticsController.industries);
analyticsRouter.get("/states", query, analyticsController.states);
analyticsRouter.get("/cities", query, analyticsController.cities);
analyticsRouter.get("/conversion", query, analyticsController.conversion);
analyticsRouter.get("/funnel-conversion", query, analyticsController.funnelConversion);
analyticsRouter.get("/trends", query, analyticsController.trends);
analyticsRouter.get("/action-queue", validate(actionQueueQuerySchema, "query"), analyticsController.actionQueue);
analyticsRouter.get("/rep-performance", query, analyticsController.repPerformance);
analyticsRouter.get("/email-engagement", query, analyticsController.emailEngagement);
analyticsRouter.get("/discovery", query, analyticsController.discovery);
analyticsRouter.get("/lead-quality", query, analyticsController.leadQuality);
analyticsRouter.get("/campaigns", query, analyticsController.campaigns);
