import { ExistingClientVertical } from "../enums/index.js";

/**
 * Seed knowledge base of Bluwheelz's 22 existing customers, grouped by
 * vertical. Consumed by packages/db/seeds/existing_clients.sql (generated
 * from this file) and by the SimilarityService when no embedding exists yet
 * for a fallback rule-based match.
 */
export interface ExistingClientSeed {
  name: string;
  vertical: ExistingClientVertical;
  domain: string;
  employeeCount: number;
  citiesCount: number;
  headquartersCity: string;
}

export const EXISTING_CLIENTS: ExistingClientSeed[] = [
  {
    name: "Blue Dart",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "bluedart.com",
    employeeCount: 12_500,
    citiesCount: 350,
    headquartersCity: "Mumbai",
  },
  {
    name: "Delhivery",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "delhivery.com",
    employeeCount: 50_000,
    citiesCount: 200,
    headquartersCity: "Gurugram",
  },
  {
    name: "DHL",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "dhl.com",
    employeeCount: 8_000,
    citiesCount: 100,
    headquartersCity: "Mumbai",
  },
  {
    name: "DB Schenker",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "dbschenker.com",
    employeeCount: 15_000,
    citiesCount: 80,
    headquartersCity: "Mumbai",
  },
  {
    name: "AllCargo",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "allcargologistics.com",
    employeeCount: 3_000,
    citiesCount: 50,
    headquartersCity: "Mumbai",
  },
  {
    name: "Mahindra Logistics",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "mahindralogistics.com",
    employeeCount: 5_000,
    citiesCount: 60,
    headquartersCity: "Mumbai",
  },
  {
    name: "Essential Logistics",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "essentiallogistics.co.in",
    employeeCount: 500,
    citiesCount: 15,
    headquartersCity: "Mumbai",
  },
  {
    name: "MTTL",
    vertical: ExistingClientVertical.LOGISTICS,
    domain: "mttlogistics.com",
    employeeCount: 300,
    citiesCount: 10,
    headquartersCity: "Mumbai",
  },

  {
    name: "Blinkit",
    vertical: ExistingClientVertical.QUICK_COMMERCE,
    domain: "blinkit.com",
    employeeCount: 10_000,
    citiesCount: 30,
    headquartersCity: "Gurugram",
  },
  {
    name: "BigBasket",
    vertical: ExistingClientVertical.QUICK_COMMERCE,
    domain: "bigbasket.com",
    employeeCount: 15_000,
    citiesCount: 40,
    headquartersCity: "Bengaluru",
  },
  {
    name: "Milk Basket",
    vertical: ExistingClientVertical.QUICK_COMMERCE,
    domain: "milkbasket.com",
    employeeCount: 800,
    citiesCount: 8,
    headquartersCity: "Gurugram",
  },
  {
    name: "Zomato HyperPure",
    vertical: ExistingClientVertical.QUICK_COMMERCE,
    domain: "hyperpure.com",
    employeeCount: 2_000,
    citiesCount: 15,
    headquartersCity: "Gurugram",
  },

  {
    name: "Reliance",
    vertical: ExistingClientVertical.RETAIL,
    domain: "ril.com",
    employeeCount: 250_000,
    citiesCount: 700,
    headquartersCity: "Mumbai",
  },
  {
    name: "Vijay Sales",
    vertical: ExistingClientVertical.RETAIL,
    domain: "vijaysales.com",
    employeeCount: 5_000,
    citiesCount: 120,
    headquartersCity: "Mumbai",
  },
  {
    name: "Vishal Mega Mart",
    vertical: ExistingClientVertical.RETAIL,
    domain: "vishalmegamart.com",
    employeeCount: 15_000,
    citiesCount: 400,
    headquartersCity: "Gurugram",
  },
  {
    name: "Dmart",
    vertical: ExistingClientVertical.RETAIL,
    domain: "dmartindia.com",
    employeeCount: 45_000,
    citiesCount: 350,
    headquartersCity: "Mumbai",
  },

  {
    name: "Battery Smart",
    vertical: ExistingClientVertical.EV,
    domain: "batterysmart.in",
    employeeCount: 1_200,
    citiesCount: 25,
    headquartersCity: "Gurugram",
  },
  {
    name: "Attero",
    vertical: ExistingClientVertical.EV,
    domain: "attero.in",
    employeeCount: 800,
    citiesCount: 10,
    headquartersCity: "Noida",
  },

  {
    name: "Asian Paints",
    vertical: ExistingClientVertical.MANUFACTURING,
    domain: "asianpaints.com",
    employeeCount: 8_000,
    citiesCount: 60,
    headquartersCity: "Mumbai",
  },
  {
    name: "Legrand",
    vertical: ExistingClientVertical.MANUFACTURING,
    domain: "legrand.co.in",
    employeeCount: 5_000,
    citiesCount: 25,
    headquartersCity: "Bengaluru",
  },
  {
    name: "Cipla",
    vertical: ExistingClientVertical.MANUFACTURING,
    domain: "cipla.com",
    employeeCount: 22_000,
    citiesCount: 40,
    headquartersCity: "Mumbai",
  },

  {
    name: "Wakefit",
    vertical: ExistingClientVertical.FURNITURE,
    domain: "wakefit.co",
    employeeCount: 2_000,
    citiesCount: 30,
    headquartersCity: "Bengaluru",
  },
];

export const EXISTING_CLIENTS_BY_NAME = new Map(EXISTING_CLIENTS.map((client) => [client.name, client]));

export function getExistingClientSeed(name: string): ExistingClientSeed | undefined {
  return EXISTING_CLIENTS_BY_NAME.get(name);
}
