import { EMBEDDING_DIMENSIONS } from "@bluwheelz/shared";
import { env } from "../../config/env.js";
import { ApiError } from "../../utils/errors.js";

const MAX_EMBEDDING_RETRIES = 6;
const EMBEDDING_RETRY_BASE_MS = 2_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  if (retryAfterHeader) {
    const seconds = Number.parseInt(retryAfterHeader, 10);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  }
  return EMBEDDING_RETRY_BASE_MS * 2 ** attempt;
}

async function fetchEmbeddingResponse(
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_EMBEDDING_RETRIES; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    lastResponse = response;

    if (response.ok) return response;

    const retryable = response.status === 429 || response.status === 503;
    if (!retryable || attempt === MAX_EMBEDDING_RETRIES) return response;

    const delay = retryDelayMs(attempt, response.headers.get("retry-after"));
    await sleep(delay);
  }

  return lastResponse!;
}

/**
 * Thin abstraction over the embeddings provider so SimilarityService never
 * imports a vendor SDK directly. Voyage AI is the default (Anthropic's
 * recommended embeddings partner); OpenAI is supported as a drop-in
 * alternative by swapping EMBEDDINGS_PROVIDER in the environment.
 *
 * All providers must return vectors of length EMBEDDING_DIMENSIONS (1024) to
 * match the pgvector schema.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  let embedding: number[];

  if (env.EMBEDDINGS_PROVIDER === "voyage") {
    if (!env.VOYAGE_API_KEY) throw ApiError.internal("VOYAGE_API_KEY is not configured");
    const response = await fetchEmbeddingResponse(
      "https://api.voyageai.com/v1/embeddings",
      {
        Authorization: `Bearer ${env.VOYAGE_API_KEY}`,
        "Content-Type": "application/json",
      },
      {
        input: text,
        model: "voyage-3",
        output_dimension: EMBEDDING_DIMENSIONS,
      },
    );
    if (!response.ok) throw ApiError.internal(`Voyage embeddings request failed: ${response.status}`);
    const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
    embedding = body.data[0]?.embedding ?? [];
  } else {
    if (!env.OPENAI_API_KEY) throw ApiError.internal("OPENAI_API_KEY is not configured");
    const response = await fetchEmbeddingResponse(
      "https://api.openai.com/v1/embeddings",
      {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      {
        input: text,
        model: "text-embedding-3-small",
        dimensions: EMBEDDING_DIMENSIONS,
      },
    );
    if (!response.ok) throw ApiError.internal(`OpenAI embeddings request failed: ${response.status}`);
    const body = (await response.json()) as { data: Array<{ embedding: number[] }> };
    embedding = body.data[0]?.embedding ?? [];
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw ApiError.internal(
      `Embedding provider returned ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`,
    );
  }

  return embedding;
}
