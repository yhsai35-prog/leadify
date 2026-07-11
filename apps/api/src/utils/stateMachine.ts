import { PIPELINE_TRANSITIONS, type PipelineStatus } from "@bluwheelz/shared";
import { ApiError } from "./errors.js";

/**
 * Validates a pipeline transition against the allow-list defined in
 * packages/shared/src/enums/index.ts. `approved -> sent` is deliberately
 * excluded from user-triggerable transitions; it is only ever written by
 * N8nWebhookService after a confirmed Gmail send.
 */
export function assertValidTransition(from: PipelineStatus, to: PipelineStatus): void {
  if (from === to) return;
  const allowed = PIPELINE_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw ApiError.invariantViolation(
      `Cannot transition lead from "${from}" to "${to}". Allowed next states: ${allowed.join(", ") || "none (terminal state)"}.`,
    );
  }
}

export function assertSystemOnlyTransitionToSent(to: PipelineStatus): void {
  if (to === "sent") {
    throw ApiError.forbidden(
      "The 'sent' status can only be set by the confirmed Gmail send webhook, not by direct API calls.",
    );
  }
}
