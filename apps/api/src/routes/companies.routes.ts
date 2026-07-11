import { Router } from "express";
import { companyIdParamSchema, companyListQuerySchema, createContactSchema } from "@bluwheelz/shared";
import { companiesController } from "../controllers/companiesController.js";
import { discoveryController } from "../controllers/discoveryController.js";
import { contactsController } from "../controllers/contactsController.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";
import { aiRateLimit } from "../middleware/rateLimit.js";

export const companiesRouter = Router();

companiesRouter.use(requireAuth);
companiesRouter.get("/", requireRole("user"), validate(companyListQuerySchema, "query"), discoveryController.listCompanies);
companiesRouter.get("/:id", requireRole("user"), validate(companyIdParamSchema, "params"), companiesController.getById);
companiesRouter.post("/:id/research", requireRole("user"), aiRateLimit, validate(companyIdParamSchema, "params"), companiesController.triggerResearch);
companiesRouter.get("/:id/intelligence", requireRole("user"), validate(companyIdParamSchema, "params"), companiesController.getIntelligence);

companiesRouter.get("/:id/contacts", requireRole("user"), contactsController.listForCompany);
companiesRouter.post("/:id/contacts", requireRole("user"), validate(createContactSchema.omit({ companyId: true })), contactsController.create);
