import type { NextFunction, Request, Response } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import type { PreferredEmailClient, SmtpSettings, UserRole } from "@bluwheelz/shared";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { ApiError } from "../utils/errors.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const jwks = createRemoteJWKSet(new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`));

/**
 * Verifies the Supabase-issued JWT and loads the application role from
 * `users.role`, rather than trusting a role claim embedded in the JWT
 * itself. This means revoking a user's access (or demoting their role) is
 * effective immediately, without waiting for token expiry.
 */
export const requireAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw ApiError.unauthorized();
  }
  const token = authHeader.slice("Bearer ".length);

  let subject: string;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });
    if (!payload.sub) throw new Error("Missing subject claim");
    subject = payload.sub;
  } catch {
    throw ApiError.unauthorized("Invalid or expired session token");
  }

  const { data: userRow, error } = await supabaseAdmin
    .from("users")
    .select(
      "id, organization_id, email, full_name, role, is_active, preferred_email_client, smtp_settings, organizations (name, logo_url, is_active)",
    )
    .eq("id", subject)
    .single();

  if (error || !userRow) {
    throw ApiError.unauthorized("No matching user account found");
  }
  if (!userRow.is_active) {
    throw ApiError.forbidden("Your account has been deactivated. Contact an administrator.");
  }

  const org = userRow.organizations as unknown as { name: string; logo_url: string | null; is_active: boolean } | null;
  // Platform super admins keep access even if their own org row is disabled;
  // tenant members are locked out as soon as their tenant is deactivated.
  if (org && org.is_active === false && userRow.role !== "super_admin") {
    throw ApiError.forbidden("Your organization has been disabled. Contact your platform administrator.");
  }

  req.user = {
    id: userRow.id,
    organizationId: userRow.organization_id,
    email: userRow.email,
    fullName: userRow.full_name,
    role: userRow.role as UserRole,
    preferredEmailClient: (userRow.preferred_email_client as PreferredEmailClient | null) ?? "none",
    smtpSettings: (userRow.smtp_settings as SmtpSettings | null) ?? {},
    organizationName: org?.name ?? "",
    organizationLogoUrl: org?.logo_url ?? null,
  };
  next();
});
