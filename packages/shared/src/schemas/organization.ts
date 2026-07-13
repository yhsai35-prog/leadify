import { z } from "zod";
import { UserRole } from "../enums/index.js";

export const icpWeightsSchema = z.object({
  industry: z.number().min(0).max(100),
  size: z.number().min(0).max(100),
  operations: z.number().min(0).max(100),
  growth: z.number().min(0).max(100),
  similarity: z.number().min(0).max(100),
});
export type IcpWeights = z.infer<typeof icpWeightsSchema>;

export const updateOrganizationSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  icpWeights: icpWeightsSchema.partial().optional(),
  companyProfile: z.string().max(4000).optional(),
});
export type UpdateOrganizationSettingsInput = z.infer<typeof updateOrganizationSettingsSchema>;

export interface Organization {
  id: string;
  name: string;
  settings: {
    icpWeights?: IcpWeights;
    [key: string]: unknown;
  };
  logoUrl: string | null;
  isActive: boolean;
  companyProfile: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Multi-tenancy (super admin tenant management)
// ---------------------------------------------------------------------------

export const tenantUserInputSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(120),
  role: z.enum([UserRole.ADMIN, UserRole.USER]),
});
export type TenantUserInput = z.infer<typeof tenantUserInputSchema>;

export const createTenantSchema = z
  .object({
    name: z.string().min(1).max(120),
    companyProfile: z.string().max(4000).optional(),
    users: z.array(tenantUserInputSchema).min(1, "Add at least one user"),
  })
  .refine((data) => data.users.some((u) => u.role === UserRole.ADMIN), {
    message: "At least one user must have the Admin role",
    path: ["users"],
  });
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

export interface TenantUserInviteResult {
  email: string;
  fullName: string;
  role: TenantUserInput["role"];
  status: "invited" | "failed";
  error?: string;
}

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  companyProfile: z.string().max(4000).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

export interface TenantSummary extends Organization {
  userCount: number;
  activeUserCount: number;
}

export const uploadLogoSchema = z.object({
  /** Base64-encoded image payload (no data: prefix). */
  fileBase64: z.string().min(1).max(3_000_000),
  contentType: z.enum(["image/png", "image/jpeg", "image/svg+xml", "image/webp"]),
});
export type UploadLogoInput = z.infer<typeof uploadLogoSchema>;

// ---------------------------------------------------------------------------
// Landing page demo requests
// ---------------------------------------------------------------------------

export const createDemoRequestSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  company: z.string().max(160).optional(),
  message: z.string().max(2000).optional(),
});
export type CreateDemoRequestInput = z.infer<typeof createDemoRequestSchema>;

export interface DemoRequest {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string | null;
  status: "new" | "contacted" | "closed";
  createdAt: string;
}
