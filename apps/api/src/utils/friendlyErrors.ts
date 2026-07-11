import { ApiError } from "../utils/errors.js";

const TECHNICAL_PATTERNS = [
  /unique constraint/i,
  /duplicate key/i,
  /violates/i,
  /postgres/i,
  /supabase/i,
  /ECONNREFUSED/i,
  /timeout/i,
  /internal server/i,
  /unknown error/i,
];

function friendlyImportFailureReason(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === "CONFLICT") return "This company is already in your pipeline.";
    if (err.statusCode >= 500) return "This company could not be saved right now. Try again shortly.";
    if (!TECHNICAL_PATTERNS.some((p) => p.test(err.message))) return err.message;
  }

  const msg = err instanceof Error ? err.message : "";
  if (/duplicate|unique|already exists/i.test(msg)) return "This company is already in your pipeline.";
  if (/timeout|network|fetch/i.test(msg)) return "The connection timed out while saving this company.";
  return "This company could not be imported. Try importing it on its own.";
}

export function mapImportFailure(err: unknown): string {
  return friendlyImportFailureReason(err);
}

export function importFailureResponse(failed: Array<{ name: string; reason: string }>): never {
  if (failed.length === 1) {
    throw ApiError.badRequest(`${failed[0]!.name} could not be imported. ${failed[0]!.reason}`);
  }

  const uniqueReasons = [...new Set(failed.map((f) => f.reason))];
  const detail =
    uniqueReasons.length === 1
      ? uniqueReasons[0]!
      : "They may already be in your pipeline or could not be saved right now.";

  throw ApiError.badRequest(`None of the ${failed.length} selected companies could be imported. ${detail}`);
}
