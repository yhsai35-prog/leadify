import type { Company } from "@bluwheelz/shared";

export function formatCompanyFirmographics(
  company: Pick<Company, "industry" | "employeeCount" | "citiesCount" | "metadata">,
): string {
  const parts: string[] = [company.industry ?? "Unclassified"];

  if (company.employeeCount != null) {
    parts.push(`${company.employeeCount.toLocaleString()} employees`);
  }

  if (company.citiesCount != null) {
    parts.push(`${company.citiesCount.toLocaleString()} cities`);
  }

  const city = (company.metadata as { city?: string } | undefined)?.city;
  if (city) parts.push(city);

  return parts.join(" · ");
}
