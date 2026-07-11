import { ApiClientError } from "./apiClient";

const FRIENDLY_BY_CODE: Record<string, string> = {
  BAD_REQUEST: "Something in your request was incomplete. Refresh the page and try again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to do this.",
  NOT_FOUND: "The requested item could not be found.",
  CONFLICT: "This record already exists in your workspace.",
  INVARIANT_VIOLATION: "This action is not allowed in the current state.",
  INTERNAL_ERROR: "We could not complete this action right now. Please try again shortly.",
  UNKNOWN_ERROR: "We could not complete this action right now. Please try again shortly.",
};

const MESSAGE_OVERRIDES: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /request validation failed/i,
    message: "Some selected company data was incomplete. Run the search again, then import.",
  },
  {
    pattern: /import failed for all/i,
    message: "None of the selected companies could be imported. They may already be in your pipeline.",
  },
  {
    pattern: /apollo search request failed/i,
    message: "Apollo search is unavailable right now. Check your filters and try again.",
  },
  {
    pattern: /duplicate|unique constraint|already exists/i,
    message: "This company is already in your pipeline.",
  },
];

const TECHNICAL_PATTERNS = [
  /unique constraint/i,
  /duplicate key/i,
  /violates/i,
  /postgres/i,
  /supabase/i,
  /internal server/i,
  /unknown error/i,
  /request validation failed/i,
  /import failed for all/i,
];

function isUserSafeMessage(message: string): boolean {
  return message.length > 0 && message.length <= 220 && !TECHNICAL_PATTERNS.some((p) => p.test(message));
}

function matchMessageOverride(message: string): string | undefined {
  return MESSAGE_OVERRIDES.find(({ pattern }) => pattern.test(message))?.message;
}

/** Returns a short, user-safe explanation — never raw stack traces or DB errors. */
export function getUserFriendlyError(err: unknown, fallback: string): string {
  if (!(err instanceof ApiClientError)) return fallback;

  const byMessage = matchMessageOverride(err.message);
  if (byMessage) return byMessage;

  if (isUserSafeMessage(err.message)) return err.message;

  const byCode = FRIENDLY_BY_CODE[err.code];
  if (byCode) return byCode;

  return fallback;
}

export const DISCOVERY_ERRORS = {
  searchTitle: "Could not search Apollo",
  searchFallback: "Apollo search did not complete. Adjust your filters and try again.",
  importTitle: "Could not import companies",
  importFallback: "Import did not complete. Try selecting fewer companies or run the search again.",
  importPartialTitle: "Import complete",
  importPartial: (imported: number, skipped: number, duplicates: number) => {
    const parts = [`${imported} ${imported === 1 ? "company" : "companies"} added to your pipeline`];
    if (duplicates > 0) parts.push(`${duplicates} already existed`);
    if (skipped > 0) parts.push(`${skipped} could not be imported`);
    return `${parts.join(". ")}.`;
  },
  importSuccess: (count: number, duplicates: number) =>
    duplicates > 0
      ? `${count} ${count === 1 ? "company" : "companies"} imported. ${duplicates} were already in your pipeline.`
      : `${count} ${count === 1 ? "company" : "companies"} imported successfully.`,
} as const;
