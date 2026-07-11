/**
 * One-time backfill: applies seed firmographics to all existing-client
 * company rows and optionally refreshes from Apollo when configured.
 */
import { EXISTING_CLIENTS } from "@bluwheelz/shared";
import { supabaseAdmin } from "../config/supabase.js";
import { companiesRepository } from "../repositories/companiesRepository.js";
import { ensureExistingClientFirmographics } from "../services/companies/existingClientEnrichmentService.js";
import { logger } from "../config/logger.js";

const PROFILE_SUMMARIES: Record<string, string> = {
  "Blue Dart": "National express logistics operator with pan-India last-mile and B2B distribution footprint.",
  Delhivery: "Large-scale e-commerce and express logistics provider with dense hub-and-spoke network across India.",
  DHL: "Global logistics brand with strong India presence in express, freight, and supply chain.",
  "DB Schenker": "Integrated logistics and supply chain operator serving manufacturing and retail clients nationwide.",
  AllCargo: "Freight forwarding and multimodal logistics provider with India-wide cargo movement.",
  "Mahindra Logistics": "Enterprise 3PL and supply chain partner for automotive, retail, and industrial clients.",
  "Essential Logistics": "Regional logistics operator supporting distribution and line-haul movements.",
  MTTL: "Specialized transport and logistics provider for industrial cargo.",
  Blinkit: "Quick-commerce operator with dark-store network and high-frequency intra-city delivery.",
  BigBasket: "Online grocery platform with warehouse-led fulfillment across major Indian cities.",
  "Milk Basket": "Subscription grocery delivery service focused on daily essentials in metro clusters.",
  "Zomato HyperPure": "B2B restaurant supply chain with cold-chain distribution to hospitality clients.",
  Reliance: "Large diversified retail and consumer conglomerate with nationwide store and distribution network.",
  "Vijay Sales": "Consumer electronics retail chain with multi-city showroom footprint.",
  "Vishal Mega Mart": "Value retail chain with extensive tier-2 and tier-3 city presence.",
  Dmart: "Discount retail chain with high-volume distribution and dense store network.",
  "Battery Smart": "EV battery swapping network operator with urban two-wheeler fleet focus.",
  Attero: "E-waste recycling and circular-economy operator with processing facilities across India.",
  "Asian Paints": "Leading paints manufacturer with wide dealer and distribution network.",
  Legrand: "Electrical equipment manufacturer with pan-India channel and institutional sales.",
  Cipla: "Pharmaceutical manufacturer with domestic and export distribution footprint.",
  Wakefit: "D2C furniture brand with manufacturing and last-mile delivery operations.",
};

async function main() {
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("id, name")
    .eq("is_existing_client", true)
    .is("deleted_at", null);

  if (error) throw error;

  const names = new Set(EXISTING_CLIENTS.map((c) => c.name));
  const rows = (data ?? []).filter((row) => names.has(row.name as string));
  logger.info({ count: rows.length }, "Enriching existing client firmographics");

  for (const row of rows) {
    const company = await companiesRepository.findById(row.id as string);
    if (!company) continue;
    await ensureExistingClientFirmographics(company);

    const summary = PROFILE_SUMMARIES[company.name];
    if (summary) {
      await supabaseAdmin
        .from("existing_client_profiles")
        .update({ profile_summary: summary })
        .eq("company_id", company.id)
        .like("profile_summary", "%Profile pending enrichment%");
    }

    logger.info({ companyId: company.id, name: company.name }, "Enriched existing client");
  }

  logger.info("Existing client firmographics backfill complete");
}

main().catch((err) => {
  logger.error({ err }, "Existing client firmographics backfill failed");
  process.exit(1);
});
