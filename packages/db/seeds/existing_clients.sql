-- ============================================================================
-- Seeds the 22 existing Bluwheelz customers as `companies` (is_existing_client
-- = true) plus their `existing_client_profiles` row. This is the AI knowledge
-- base the QualificationService and SimilarityService learn from.
--
-- Generated from packages/shared/src/constants/existingClients.ts -- if that
-- list changes, regenerate this file (do not hand-edit the two out of sync).
--
-- Embeddings are intentionally left NULL here; run
-- `npm run seed:embeddings --workspace=apps/api` after this script to backfill
-- `companies.embedding` / `existing_client_profiles.embedding` via the
-- Claude/embeddings provider, since generating vectors requires an API call
-- and cannot happen in plain SQL.
-- ============================================================================

with org as (
  select '00000000-0000-0000-0000-000000000001'::uuid as id
),
seed_data (name, industry, vertical, domain, employee_count, cities_count, headquarters_city, profile_summary) as (
  values
    ('Blue Dart', 'Logistics', 'logistics', 'bluedart.com', 12500, 350, 'Mumbai', 'National express logistics operator with pan-India last-mile and B2B distribution footprint.'),
    ('Delhivery', 'Logistics', 'logistics', 'delhivery.com', 50000, 200, 'Gurugram', 'Large-scale e-commerce and express logistics provider with dense hub-and-spoke network across India.'),
    ('DHL', 'Logistics', 'logistics', 'dhl.com', 8000, 100, 'Mumbai', 'Global logistics brand with strong India presence in express, freight, and supply chain.'),
    ('DB Schenker', 'Logistics', 'logistics', 'dbschenker.com', 15000, 80, 'Mumbai', 'Integrated logistics and supply chain operator serving manufacturing and retail clients nationwide.'),
    ('AllCargo', 'Logistics', 'logistics', 'allcargologistics.com', 3000, 50, 'Mumbai', 'Freight forwarding and multimodal logistics provider with India-wide cargo movement.'),
    ('Mahindra Logistics', 'Logistics', 'logistics', 'mahindralogistics.com', 5000, 60, 'Mumbai', 'Enterprise 3PL and supply chain partner for automotive, retail, and industrial clients.'),
    ('Essential Logistics', 'Logistics', 'logistics', 'essentiallogistics.co.in', 500, 15, 'Mumbai', 'Regional logistics operator supporting distribution and line-haul movements.'),
    ('MTTL', 'Logistics', 'logistics', 'mttlogistics.com', 300, 10, 'Mumbai', 'Specialized transport and logistics provider for industrial cargo.'),
    ('Blinkit', 'Quick Commerce', 'quick_commerce', 'blinkit.com', 10000, 30, 'Gurugram', 'Quick-commerce operator with dark-store network and high-frequency intra-city delivery.'),
    ('BigBasket', 'Quick Commerce', 'quick_commerce', 'bigbasket.com', 15000, 40, 'Bengaluru', 'Online grocery platform with warehouse-led fulfillment across major Indian cities.'),
    ('Milk Basket', 'Quick Commerce', 'quick_commerce', 'milkbasket.com', 800, 8, 'Gurugram', 'Subscription grocery delivery service focused on daily essentials in metro clusters.'),
    ('Zomato HyperPure', 'Quick Commerce', 'quick_commerce', 'hyperpure.com', 2000, 15, 'Gurugram', 'B2B restaurant supply chain with cold-chain distribution to hospitality clients.'),
    ('Reliance', 'Retail', 'retail', 'ril.com', 250000, 700, 'Mumbai', 'Large diversified retail and consumer conglomerate with nationwide store and distribution network.'),
    ('Vijay Sales', 'Retail', 'retail', 'vijaysales.com', 5000, 120, 'Mumbai', 'Consumer electronics retail chain with multi-city showroom footprint.'),
    ('Vishal Mega Mart', 'Retail', 'retail', 'vishalmegamart.com', 15000, 400, 'Gurugram', 'Value retail chain with extensive tier-2 and tier-3 city presence.'),
    ('Dmart', 'Retail', 'retail', 'dmartindia.com', 45000, 350, 'Mumbai', 'Discount retail chain with high-volume distribution and dense store network.'),
    ('Battery Smart', 'EV', 'ev', 'batterysmart.in', 1200, 25, 'Gurugram', 'EV battery swapping network operator with urban two-wheeler fleet focus.'),
    ('Attero', 'EV', 'ev', 'attero.in', 800, 10, 'Noida', 'E-waste recycling and circular-economy operator with processing facilities across India.'),
    ('Asian Paints', 'Manufacturing', 'manufacturing', 'asianpaints.com', 8000, 60, 'Mumbai', 'Leading paints manufacturer with wide dealer and distribution network.'),
    ('Legrand', 'Manufacturing', 'manufacturing', 'legrand.co.in', 5000, 25, 'Bengaluru', 'Electrical equipment manufacturer with pan-India channel and institutional sales.'),
    ('Cipla', 'Manufacturing', 'manufacturing', 'cipla.com', 22000, 40, 'Mumbai', 'Pharmaceutical manufacturer with domestic and export distribution footprint.'),
    ('Wakefit', 'Furniture', 'furniture', 'wakefit.co', 2000, 30, 'Bengaluru', 'D2C furniture brand with manufacturing and last-mile delivery operations.')
),
inserted_companies as (
  insert into companies (
    organization_id, name, industry, domain, employee_count, cities_count, is_existing_client, metadata
  )
  select
    org.id,
    seed_data.name,
    seed_data.industry,
    seed_data.domain,
    seed_data.employee_count,
    seed_data.cities_count,
    true,
    jsonb_build_object('city', seed_data.headquarters_city)
  from seed_data, org
  on conflict (organization_id, domain) do nothing
  returning id, name
)
insert into existing_client_profiles (company_id, vertical, profile_summary)
select ic.id, seed_data.vertical::existing_client_vertical, seed_data.profile_summary
from inserted_companies ic
join seed_data on seed_data.name = ic.name
on conflict (company_id) do nothing;
