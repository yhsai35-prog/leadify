/**
 * Backfill missing company city/state metadata via Apollo domain enrichment.
 */
import { supabaseAdmin } from "../config/supabase.js";
import { companiesRepository } from "../repositories/companiesRepository.js";
import { enrichOrganizationByDomain } from "../services/apollo/apolloClient.js";
import { logger } from "../config/logger.js";

async function main() {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, domain, metadata")
    .is("deleted_at", null)
    .not("domain", "is", null);

  if (error) throw error;

  const rows = (data ?? []).filter((row) => {
    const metadata = (row.metadata ?? {}) as { city?: string; state?: string };
    return !metadata.city || !metadata.state;
  });

  logger.info({ count: rows.length }, "Backfilling company geo metadata");

  for (const row of rows) {
    const domain = row.domain as string;
    const company = await companiesRepository.findById(row.id as string);
    if (!company?.domain) continue;

    const apollo = await enrichOrganizationByDomain(domain);
    const metadata = { ...(company.metadata as Record<string, unknown>) };
    let changed = false;
    if (!metadata.city && apollo.city) {
      metadata.city = apollo.city;
      changed = true;
    }
    if (changed) {
      await companiesRepository.update(company.id, { metadata });
      logger.info({ companyId: company.id, domain }, "Updated company geo metadata");
    }
  }

  logger.info("Company geo backfill complete");
}

main().catch((err) => {
  logger.error({ err }, "Company geo backfill failed");
  process.exit(1);
});
