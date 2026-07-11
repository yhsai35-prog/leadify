import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserSelector } from "@/components/UserSelector";
import { ActionCenterPanel } from "./ActionCenterPanel";
import { ActivityTrendsChart } from "./ActivityTrendsChart";
import { CampaignPerformanceTable } from "./CampaignPerformanceTable";
import { CityBarChart } from "./CityBarChart";
import { ConversionFunnelChart } from "./ConversionFunnelChart";
import { DateRangePicker } from "./DateRangePicker";
import { DiscoveryFunnelChart } from "./DiscoveryFunnelChart";
import { EmailEngagementCard } from "./EmailEngagementCard";
import { IndustryPieChart } from "./IndustryPieChart";
import { KpiCardGrid } from "./KpiCardGrid";
import { LeadQualityCard } from "./LeadQualityCard";
import { RepLeaderboardTable } from "./RepLeaderboardTable";
import { StateBarChart } from "./StateBarChart";
import { useDashboardFilters } from "./useDashboardFilters";

const PERIOD_LABELS = { "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days" } as const;

export function DashboardPage() {
  const filters = useDashboardFilters();
  const queryParams = { userId: filters.userId, from: filters.from, to: filters.to };
  const periodLabel = PERIOD_LABELS[filters.preset];

  return (
    <div className="dashboard-fade-in space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.08] via-card to-background p-6 md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {filters.scopeLabel}
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">{filters.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <DateRangePicker value={filters.preset} onChange={filters.setPreset} />
              {filters.canDrillDown && (
                <UserSelector value={filters.selectedUserId} onChange={filters.setSelectedUserId} />
              )}
              <Button asChild variant="default" className="gap-2 shadow-md shadow-primary/20">
                <Link to="/discovery">
                  Discover leads
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/pipeline">View pipeline</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <ActionCenterPanel params={queryParams} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Key metrics
        </div>
        <KpiCardGrid params={queryParams} periodLabel={periodLabel} />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Performance
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <ActivityTrendsChart params={queryParams} />
          <ConversionFunnelChart params={queryParams} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="grid gap-5 lg:grid-cols-2">
          {filters.canDrillDown && !filters.selectedUserId && (
            <RepLeaderboardTable params={queryParams} />
          )}
          <div className={filters.canDrillDown && !filters.selectedUserId ? "" : "lg:col-span-2"}>
            <CampaignPerformanceTable params={queryParams} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4 text-primary" />
          Pipeline insights
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <IndustryPieChart params={queryParams} />
          <LeadQualityCard params={queryParams} />
          <DiscoveryFunnelChart params={queryParams} />
          <EmailEngagementCard params={queryParams} />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MapPin className="h-4 w-4 text-primary" />
          Geographic distribution
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <StateBarChart params={queryParams} />
          <CityBarChart params={queryParams} />
        </div>
      </section>
    </div>
  );
}
