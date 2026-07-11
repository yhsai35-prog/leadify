/**
 * One-time backfill script: generates embeddings for every existing-client
 * profile and its company row (see packages/db/seeds/existing_clients.sql,
 * which intentionally leaves `embedding` NULL because plain SQL can't call
 * an embeddings API). Run after applying migrations and seeds:
 *
 *   npm run seed:embeddings --workspace=apps/api
 */
import { supabaseAdmin } from "../config/supabase.js";
import { generateEmbedding } from "../services/embeddings/embeddingsProvider.js";
import { logger } from "../config/logger.js";

const DELAY_BETWEEN_EMBEDDINGS_MS = 1_500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { data: profiles, error } = await supabaseAdmin
    .from("existing_client_profiles")
    .select("id, company_id, vertical, profile_summary, company:companies(name, industry, employee_count, cities_count)")
    .is("embedding", null);

  if (error) throw error;
  if (!profiles || profiles.length === 0) {
    logger.info("No existing_client_profiles need embeddings. Nothing to do.");
    return;
  }

  logger.info(`Embedding ${profiles.length} existing client profile(s)...`);

  for (let index = 0; index < profiles.length; index++) {
    const profile = profiles[index]!;
    const company = profile.company as unknown as {
      name: string;
      industry: string | null;
      employee_count: number | null;
      cities_count: number | null;
    } | null;
    const text = `${company?.name ?? "Unknown"} operates in ${company?.industry ?? profile.vertical} with approximately ${company?.employee_count ?? "an unknown number of"} employees across ${company?.cities_count ?? "an unknown number of"} cities. ${profile.profile_summary}`;

    const embedding = await generateEmbedding(text);

    await supabaseAdmin.from("existing_client_profiles").update({ embedding }).eq("id", profile.id);
    await supabaseAdmin.from("companies").update({ embedding }).eq("id", profile.company_id);

    logger.info(`Embedded ${index + 1}/${profiles.length}: ${company?.name ?? profile.id}`);

    if (index < profiles.length - 1) {
      await sleep(DELAY_BETWEEN_EMBEDDINGS_MS);
    }
  }

  logger.info("Finished embedding all existing client profiles.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error({ err }, "seedEmbeddings failed");
    process.exit(1);
  });
