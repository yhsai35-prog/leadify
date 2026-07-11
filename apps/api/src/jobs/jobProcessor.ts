import type { JobType } from "@bluwheelz/shared";
import { jobQueueRepository, type JobRecord } from "../repositories/jobQueueRepository.js";
import { qualificationService } from "../services/qualification/qualificationService.js";
import { researchService } from "../services/research/researchService.js";
import { similarityService } from "../services/similarity/similarityService.js";
import { outreachService } from "../services/outreach/outreachService.js";
import { logger } from "../config/logger.js";

/**
 * Dispatches a claimed job to the service that does the actual (slow,
 * Claude-backed) work. Kept as a lookup table rather than a switch so new
 * job types are a one-line addition.
 */
const handlers: Record<JobType, (payload: Record<string, unknown>) => Promise<unknown>> = {
  qualify: (payload) => qualificationService.qualifyLead(payload.leadId as string, payload.userId as string),
  research: (payload) =>
    researchService.researchCompany(payload.companyId as string, payload.leadId as string | undefined, payload.userId as string),
  similarity: (payload) =>
    similarityService.computeSimilarityForLead(payload.leadId as string, payload.userId as string | undefined),
  generate_email: (payload) =>
    outreachService.generateEmail(
      payload.leadId as string,
      payload.contactId as string,
      (payload.type as never) ?? "initial",
      (payload.tone as string) ?? "professional",
      payload.userId as string,
    ),
  classify_reply: async () => {
    throw new Error("classify_reply jobs are handled synchronously via the n8n reply webhook, not the queue");
  },
};

async function processJob(job: JobRecord): Promise<void> {
  try {
    const handler = handlers[job.type];
    const result = await handler(job.payload);
    await jobQueueRepository.markCompleted(job.id, (result as Record<string, unknown>) ?? {});
  } catch (err) {
    logger.error({ err, jobId: job.id, type: job.type }, "Job processing failed");
    const message = err instanceof Error ? err.message : "Unknown error";
    await jobQueueRepository.markFailed(job.id, message, job.attempts + 1, job.maxAttempts);
  }
}

/**
 * Runs one processing tick: claims a small batch of pending jobs and
 * processes them concurrently. Invoked either by the internal cron endpoint
 * (`POST /internal/jobs/process`, polled by Railway/n8n cron every minute)
 * or directly by `startJobProcessorLoop` in long-running server mode.
 */
export async function runJobProcessorTick(batchSize = 5): Promise<number> {
  const jobs = await jobQueueRepository.claimPending(batchSize);
  await Promise.all(jobs.map(processJob));
  return jobs.length;
}

export function startJobProcessorLoop(intervalMs = 5000): NodeJS.Timeout {
  return setInterval(() => {
    runJobProcessorTick().catch((err) => logger.error({ err }, "Job processor tick failed"));
  }, intervalMs);
}
