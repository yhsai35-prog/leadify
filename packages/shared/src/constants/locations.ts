/** Indian states and union territories for Apollo `organization_locations` filters. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

/** Maps common Apollo city names to Indian states for dashboard grouping. */
export const CITY_TO_INDIAN_STATE: Record<string, IndianState> = {
  mumbai: "Maharashtra",
  pune: "Maharashtra",
  nagpur: "Maharashtra",
  gurugram: "Haryana",
  gurgaon: "Haryana",
  faridabad: "Haryana",
  bengaluru: "Karnataka",
  bangalore: "Karnataka",
  chennai: "Tamil Nadu",
  hyderabad: "Telangana",
  kolkata: "West Bengal",
  delhi: "Delhi",
  "new delhi": "Delhi",
  noida: "Uttar Pradesh",
  "greater noida": "Uttar Pradesh",
  ahmedabad: "Gujarat",
  surat: "Gujarat",
  jaipur: "Rajasthan",
  kozhikode: "Kerala",
  kochi: "Kerala",
  patiala: "Punjab",
  chandigarh: "Chandigarh",
  indore: "Madhya Pradesh",
  bhopal: "Madhya Pradesh",
  lucknow: "Uttar Pradesh",
  visakhapatnam: "Andhra Pradesh",
};

export function resolveCompanyState(metadata?: { state?: string; city?: string } | null): string {
  if (metadata?.state && metadata.state !== "India") return metadata.state;

  const city = metadata?.city?.trim().toLowerCase();
  if (city) {
    const mapped = CITY_TO_INDIAN_STATE[city];
    if (mapped) return mapped;
  }

  return "Unknown";
}

function titleCaseCity(city: string): string {
  return city
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Normalized display city from company metadata (Apollo import stores `metadata.city`). */
export function resolveCompanyCity(metadata?: { city?: string } | null): string {
  const raw = metadata?.city?.trim();
  if (!raw) return "Unknown";
  return titleCaseCity(raw);
}

export interface CityLeadBreakdown {
  city: string;
  state: string;
  count: number;
}
