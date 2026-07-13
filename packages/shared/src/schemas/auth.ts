import { z } from "zod";
import { UserRole } from "../enums/index.js";
import type { PreferredEmailClient, SmtpSettings } from "./userSettings.js";

export const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.nativeEnum(UserRole),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

/** Passwordless login: request a one-time code emailed to the user. */
export const requestOtpSchema = z.object({
  email: z.string().email(),
});
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export interface AuthenticatedUser {
  id: string;
  organizationId: string;
  email: string;
  fullName: string;
  role: UserRole;
  preferredEmailClient: PreferredEmailClient;
  smtpSettings: SmtpSettings;
  /** Tenant branding surfaced to the web app on /auth/me. */
  organizationName: string;
  organizationLogoUrl: string | null;
}
