/**
 * Ideal Customer Profile scoring configuration. These weights and thresholds
 * are the single source of truth consumed by the QualificationService prompt
 * builder (apps/api) and by the score breakdown UI (apps/web).
 */

export const ICP_TARGET_INDUSTRIES = [
  "Logistics",
  "3PL",
  "Last Mile Delivery",
  "Retail Distribution",
  "Warehousing",
  "FMCG",
  "Pharma",
  "Manufacturing",
  "EV",
  "Quick Commerce",
] as const;

export const ICP_SIZE_THRESHOLDS = {
  minEmployees: 500,
  minRevenueInrCr: 100,
} as const;

export const ICP_OPERATIONS_THRESHOLDS = {
  minCities: 3,
  minVehicles: 50,
  requiresWarehouseNetwork: true,
  requiresDeliveryOperations: true,
  requiresOutsourcedLogistics: true,
} as const;

export const ICP_SCORE_WEIGHTS = {
  industry: 30,
  size: 25,
  operations: 25,
  growth: 10,
  similarity: 10,
} as const;

export const ICP_PRIORITY_THRESHOLDS = {
  critical: 85,
  high: 70,
  medium: 50,
  // anything below `medium` is `low`
} as const;

export const TARGET_DECISION_MAKER_TITLES = [
  "Fleet Manager",
  "Operations Manager",
  "Head of Logistics",
  "Supply Chain Head",
  "Regional Operations Head",
  "Transport Manager",
  "Procurement Head",
  "Warehouse Manager",
  "Admin Head",
  "COO",
] as const;

/** Lead Discovery dropdown groups (decoupled from ICP_TARGET_INDUSTRIES used for AI qualification). */
export const DISCOVERY_INDUSTRY_GROUPS = [
  "Logistics & Supply Chain",
  "Retail & Consumer",
  "Manufacturing & Industrial",
  "Construction & Utilities",
  "Transportation & Transit",
  "Healthcare",
  "Facilities & Support Services",
  "Government & Public Sector",
  "IT & Software",
] as const;

export type DiscoveryIndustryGroup = (typeof DISCOVERY_INDUSTRY_GROUPS)[number];

export interface DiscoveryIndustryEntry {
  /** Display label shown in the Industry multi-select dropdown. */
  label: string;
  /** Apollo keyword tag used for search + post-enrich industry matching. */
  keyword: string;
}

/** Sub-industries per Lead Discovery category, with display label + Apollo keyword. */
export const DISCOVERY_INDUSTRY_CATALOG: Record<DiscoveryIndustryGroup, readonly DiscoveryIndustryEntry[]> = {
  "Logistics & Supply Chain": [
    { label: "Logistics & Supply Chain", keyword: "logistics & supply chain" },
    { label: "Transportation/Trucking/Railroad", keyword: "transportation/trucking/railroad" },
    { label: "Package/Freight Delivery", keyword: "package/freight delivery" },
    { label: "Freight & Package Transportation", keyword: "freight & package transportation" },
    { label: "Warehousing", keyword: "warehousing" },
    { label: "Distribution", keyword: "distribution" },
    { label: "Supply Chain Management", keyword: "supply chain management" },
    { label: "Courier Services", keyword: "courier services" },
    { label: "Import & Export", keyword: "import & export" },
    { label: "Third-Party Logistics (3PL)", keyword: "third-party logistics (3pl)" },
    { label: "Last Mile Delivery", keyword: "last mile delivery" },
  ],
  "Retail & Consumer": [
    { label: "Retail", keyword: "retail" },
    { label: "Wholesale", keyword: "wholesale" },
    { label: "Online Retail", keyword: "online retail" },
    { label: "Internet", keyword: "internet" },
    { label: "Marketplace", keyword: "marketplace" },
    { label: "Consumer Goods", keyword: "consumer goods" },
    { label: "Food & Beverages", keyword: "food & beverages" },
    { label: "Food Production", keyword: "food production" },
    { label: "Supermarkets", keyword: "supermarkets" },
    { label: "Consumer Services", keyword: "consumer services" },
  ],
  "Manufacturing & Industrial": [
    { label: "Manufacturing", keyword: "manufacturing" },
    { label: "Automotive", keyword: "automotive" },
    { label: "Automotive Components", keyword: "automotive components" },
    { label: "Industrial Automation", keyword: "industrial automation" },
    { label: "Machinery", keyword: "machinery" },
    { label: "Mechanical Engineering", keyword: "mechanical engineering" },
    { label: "Electrical Equipment", keyword: "electrical equipment" },
    { label: "Electrical/Electronic Manufacturing", keyword: "electrical/electronic manufacturing" },
    { label: "Building Materials", keyword: "building materials" },
    { label: "Steel", keyword: "steel" },
    { label: "Cement", keyword: "cement" },
    { label: "Mining & Metals", keyword: "mining & metals" },
    { label: "Oil & Energy", keyword: "oil & energy" },
    { label: "Chemicals", keyword: "chemicals" },
    { label: "Plastics", keyword: "plastics" },
    { label: "Packaging", keyword: "packaging" },
    { label: "Medical Devices", keyword: "medical devices" },
    { label: "Textiles", keyword: "textiles" },
    { label: "Renewables & Environment", keyword: "renewables & environment" },
    { label: "Battery Manufacturing", keyword: "battery manufacturing" },
    { label: "Semiconductors", keyword: "semiconductors" },
  ],
  "Construction & Utilities": [
    { label: "Construction", keyword: "construction" },
    { label: "Real Estate", keyword: "real estate" },
    { label: "Facilities Services", keyword: "facilities services" },
    { label: "Environmental Services", keyword: "environmental services" },
    { label: "Waste Management", keyword: "waste management" },
    { label: "Utilities", keyword: "utilities" },
    { label: "Energy", keyword: "energy" },
    { label: "Telecommunications", keyword: "telecommunications" },
  ],
  "Transportation & Transit": [
    { label: "Public Transportation", keyword: "public transportation" },
    { label: "Bus Operators", keyword: "bus operators" },
    { label: "Taxi Services", keyword: "taxi services" },
    { label: "Ride Sharing", keyword: "ride sharing" },
    { label: "Airports", keyword: "airports" },
    { label: "Aviation", keyword: "aviation" },
    { label: "Railroads", keyword: "railroads" },
    { label: "Maritime", keyword: "maritime" },
    { label: "Ports", keyword: "ports" },
  ],
  Healthcare: [
    { label: "Healthcare", keyword: "healthcare" },
    { label: "Hospital & Health Care", keyword: "hospital & health care" },
    { label: "Home Healthcare", keyword: "home healthcare" },
    { label: "Pharmaceuticals", keyword: "pharmaceuticals" },
  ],
  "Facilities & Support Services": [
    { label: "Security & Investigations", keyword: "security & investigations" },
    { label: "Mechanical Services", keyword: "mechanical services" },
    { label: "Electrical Services", keyword: "electrical services" },
    { label: "HVAC", keyword: "hvac" },
    { label: "Pest Control", keyword: "pest control" },
    { label: "Laundry Services", keyword: "laundry services" },
  ],
  "Government & Public Sector": [
    { label: "Government Administration", keyword: "government administration" },
    { label: "Municipal Services", keyword: "municipal services" },
    { label: "Defense", keyword: "defense" },
  ],
  "IT & Software": [
    { label: "Information Technology & Services", keyword: "information technology & services" },
    { label: "Computer Software", keyword: "computer software" },
  ],
};

/** Flat lookup of every sub-industry label to its Apollo keyword, across all categories. */
const DISCOVERY_LABEL_TO_KEYWORD = new Map<string, string>(
  Object.values(DISCOVERY_INDUSTRY_CATALOG).flatMap((entries) => entries.map((e) => [e.label, e.keyword] as const)),
);

/** Flat lookup of every sub-industry label to its parent category. */
const DISCOVERY_LABEL_TO_GROUP = new Map<string, DiscoveryIndustryGroup>(
  (Object.entries(DISCOVERY_INDUSTRY_CATALOG) as [DiscoveryIndustryGroup, readonly DiscoveryIndustryEntry[]][]).flatMap(
    ([group, entries]) => entries.map((e) => [e.label, group] as const),
  ),
);

/** Sub-industry display labels for a given Lead Discovery category, for the Industry dropdown. */
export function discoveryIndustriesForGroup(group: string): string[] {
  return (DISCOVERY_INDUSTRY_CATALOG[group as DiscoveryIndustryGroup] ?? []).map((e) => e.label);
}

/** Apollo keyword for a sub-industry display label (falls back to a lowercased label for legacy/unknown values). */
export function discoveryApolloKeyword(label: string): string {
  return DISCOVERY_LABEL_TO_KEYWORD.get(label) ?? label.toLowerCase();
}

/**
 * Resolves the parent category for a saved sub-industry label or legacy group
 * name (from sessionStorage), so the Discovery form can restore both dropdowns.
 */
export function inferDiscoveryCategory(value: string | undefined): DiscoveryIndustryGroup {
  if (value && DISCOVERY_LABEL_TO_GROUP.has(value)) return DISCOVERY_LABEL_TO_GROUP.get(value)!;
  if (value && (DISCOVERY_INDUSTRY_GROUPS as readonly string[]).includes(value)) {
    return value as DiscoveryIndustryGroup;
  }
  return DISCOVERY_INDUSTRY_GROUPS[0];
}

export function apolloKeywordTagsForIndustries(selectedIndustries: string[]): string[] {
  const tags = new Set<string>();
  for (const industry of selectedIndustries) {
    tags.add(discoveryApolloKeyword(industry));
  }
  return Array.from(tags);
}

/** Keeps only companies whose Apollo-enriched industry tag matches the user's discovery selection. */
export function industryMatchesIcpSelection(
  apolloIndustry: string | null | undefined,
  selectedIndustries: string[],
): boolean {
  if (!apolloIndustry) return false;
  const lower = apolloIndustry.toLowerCase();
  return selectedIndustries.some((selected) => lower.includes(discoveryApolloKeyword(selected)));
}
