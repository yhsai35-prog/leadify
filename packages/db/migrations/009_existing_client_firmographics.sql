-- Backfill firmographics for the 22 seeded existing Bluwheelz clients so company
-- pages show employees, cities, and domains instead of placeholder values.
-- Source of truth: packages/shared/src/constants/existingClients.ts

update companies as c
set
  domain = case
    when c.domain is not null then c.domain
    when exists (
      select 1
      from companies as other
      where other.organization_id = c.organization_id
        and other.domain = v.domain
        and other.id <> c.id
        and other.deleted_at is null
    ) then c.domain
    else v.domain
  end,
  employee_count = coalesce(c.employee_count, v.employee_count),
  cities_count = coalesce(c.cities_count, v.cities_count),
  metadata = coalesce(c.metadata, '{}'::jsonb)
    || case
      when coalesce(c.metadata->>'city', '') = '' then jsonb_build_object('city', v.headquarters_city)
      else '{}'::jsonb
    end,
  updated_at = now()
from (
  values
    ('Blue Dart', 'bluedart.com', 12500, 350, 'Mumbai'),
    ('Delhivery', 'delhivery.com', 50000, 200, 'Gurugram'),
    ('DHL', 'dhl.com', 8000, 100, 'Mumbai'),
    ('DB Schenker', 'dbschenker.com', 15000, 80, 'Mumbai'),
    ('AllCargo', 'allcargologistics.com', 3000, 50, 'Mumbai'),
    ('Mahindra Logistics', 'mahindralogistics.com', 5000, 60, 'Mumbai'),
    ('Essential Logistics', 'essentiallogistics.co.in', 500, 15, 'Mumbai'),
    ('MTTL', 'mttlogistics.com', 300, 10, 'Mumbai'),
    ('Blinkit', 'blinkit.com', 10000, 30, 'Gurugram'),
    ('BigBasket', 'bigbasket.com', 15000, 40, 'Bengaluru'),
    ('Milk Basket', 'milkbasket.com', 800, 8, 'Gurugram'),
    ('Zomato HyperPure', 'hyperpure.com', 2000, 15, 'Gurugram'),
    ('Reliance', 'ril.com', 250000, 700, 'Mumbai'),
    ('Vijay Sales', 'vijaysales.com', 5000, 120, 'Mumbai'),
    ('Vishal Mega Mart', 'vishalmegamart.com', 15000, 400, 'Gurugram'),
    ('Dmart', 'dmartindia.com', 45000, 350, 'Mumbai'),
    ('Battery Smart', 'batterysmart.in', 1200, 25, 'Gurugram'),
    ('Attero', 'attero.in', 800, 10, 'Noida'),
    ('Asian Paints', 'asianpaints.com', 8000, 60, 'Mumbai'),
    ('Legrand', 'legrand.co.in', 5000, 25, 'Bengaluru'),
    ('Cipla', 'cipla.com', 22000, 40, 'Mumbai'),
    ('Wakefit', 'wakefit.co', 2000, 30, 'Bengaluru')
) as v(name, domain, employee_count, cities_count, headquarters_city)
where c.is_existing_client = true
  and c.name = v.name
  and c.deleted_at is null;

update existing_client_profiles as ecp
set profile_summary = v.summary
from companies as c
join (
  values
    ('Blue Dart', 'National express logistics operator with pan-India last-mile and B2B distribution footprint.'),
    ('Delhivery', 'Large-scale e-commerce and express logistics provider with dense hub-and-spoke network across India.'),
    ('DHL', 'Global logistics brand with strong India presence in express, freight, and supply chain.'),
    ('DB Schenker', 'Integrated logistics and supply chain operator serving manufacturing and retail clients nationwide.'),
    ('AllCargo', 'Freight forwarding and multimodal logistics provider with India-wide cargo movement.'),
    ('Mahindra Logistics', 'Enterprise 3PL and supply chain partner for automotive, retail, and industrial clients.'),
    ('Essential Logistics', 'Regional logistics operator supporting distribution and line-haul movements.'),
    ('MTTL', 'Specialized transport and logistics provider for industrial cargo.'),
    ('Blinkit', 'Quick-commerce operator with dark-store network and high-frequency intra-city delivery.'),
    ('BigBasket', 'Online grocery platform with warehouse-led fulfillment across major Indian cities.'),
    ('Milk Basket', 'Subscription grocery delivery service focused on daily essentials in metro clusters.'),
    ('Zomato HyperPure', 'B2B restaurant supply chain with cold-chain distribution to hospitality clients.'),
    ('Reliance', 'Large diversified retail and consumer conglomerate with nationwide store and distribution network.'),
    ('Vijay Sales', 'Consumer electronics retail chain with multi-city showroom footprint.'),
    ('Vishal Mega Mart', 'Value retail chain with extensive tier-2 and tier-3 city presence.'),
    ('Dmart', 'Discount retail chain with high-volume distribution and dense store network.'),
    ('Battery Smart', 'EV battery swapping network operator with urban two-wheeler fleet focus.'),
    ('Attero', 'E-waste recycling and circular-economy operator with processing facilities across India.'),
    ('Asian Paints', 'Leading paints manufacturer with wide dealer and distribution network.'),
    ('Legrand', 'Electrical equipment manufacturer with pan-India channel and institutional sales.'),
    ('Cipla', 'Pharmaceutical manufacturer with domestic and export distribution footprint.'),
    ('Wakefit', 'D2C furniture brand with manufacturing and last-mile delivery operations.')
) as v(name, summary) on v.name = c.name
where ecp.company_id = c.id
  and c.is_existing_client = true
  and ecp.profile_summary like '%Profile pending enrichment%';
