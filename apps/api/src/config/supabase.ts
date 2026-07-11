import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

/**
 * Service-role Supabase client. The API is the only trusted caller of the
 * database (see the RLS note in packages/db/migrations/001_initial_schema.sql):
 * organization scoping and RBAC are enforced in middleware, not by RLS
 * policies keyed off end-user JWTs.
 */
export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
