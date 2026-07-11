import { z } from "zod";
import { paginationQuerySchema, uuidSchema } from "./common.js";

export const companyFiltersSchema = z.object({
  industry: z.string().optional(),
  minRevenueInrCr: z.coerce.number().min(0).optional(),
  city: z.string().optional(),
  isExistingClient: z.coerce.boolean().optional(),
  search: z.string().optional(),
});
export type CompanyFilters = z.infer<typeof companyFiltersSchema>;

export const companyListQuerySchema = companyFiltersSchema.merge(paginationQuerySchema);
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

export const apolloSearchSchema = z.object({
  industries: z.array(z.string()).min(1),
  locations: z.array(z.string()).optional(),
  titles: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  perPage: z.number().int().min(1).max(10).default(10),
});
export type ApolloSearchInput = z.infer<typeof apolloSearchSchema>;

const apolloOrganizationSchema = z.object({
  apolloId: z.string(),
  name: z.string(),
  domain: z.string().nullish(),
  industry: z.string().nullish(),
  employeeCount: z.number().nullish(),
  city: z.string().nullish(),
});

const apolloPersonSchema = z.object({
  apolloId: z.string(),
  firstName: z.string(),
  lastName: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  title: z.string().nullish(),
  linkedinUrl: z.string().nullish(),
  organizationApolloId: z.string(),
  hasEmail: z.boolean().optional(),
});

/**
 * Carries the full organization/people payload the frontend already
 * received from `/discovery/apollo/search`, rather than re-fetching by ID.
 * Avoids a second round trip to Apollo (and the cost that implies) just to
 * import records the user already has in view.
 */
export const apolloImportSchema = z.object({
  organizations: z.array(apolloOrganizationSchema).min(1),
  people: z.array(apolloPersonSchema).default([]),
  searchState: z.string().optional(),
});
export type ApolloImportInput = z.infer<typeof apolloImportSchema>;

export const csvImportRowSchema = z.object({
  companyName: z.string().min(1),
  domain: z.string().optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().optional(),
  city: z.string().optional(),
  contactFirstName: z.string().optional(),
  contactLastName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactTitle: z.string().optional(),
});
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;

export const csvImportSchema = z.object({
  rows: z.array(csvImportRowSchema).min(1),
});
export type CsvImportInput = z.infer<typeof csvImportSchema>;

export const createCompanySchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1).optional(),
  industry: z.string().optional(),
  employeeCount: z.number().int().min(0).optional(),
  revenueInrCr: z.number().min(0).optional(),
  citiesCount: z.number().int().min(0).optional(),
  fleetSizeEstimate: z.number().int().min(0).optional(),
});
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

export const companyIdParamSchema = z.object({ id: uuidSchema });
