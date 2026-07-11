import { Router } from "express";
import { apolloSearchSchema, apolloImportSchema, csvImportSchema } from "@bluwheelz/shared";
import { discoveryController } from "../controllers/discoveryController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { aiRateLimit } from "../middleware/rateLimit.js";

export const discoveryRouter = Router();

discoveryRouter.use(requireAuth);
discoveryRouter.post("/apollo/search", requireRole("user"), aiRateLimit, validate(apolloSearchSchema), discoveryController.searchApollo);
discoveryRouter.post("/apollo/import", requireRole("user"), validate(apolloImportSchema), discoveryController.importApollo);
discoveryRouter.post("/import/csv", requireRole("user"), validate(csvImportSchema), discoveryController.importCsv);
discoveryRouter.get("/duplicates", requireRole("user"), discoveryController.checkDuplicate);
