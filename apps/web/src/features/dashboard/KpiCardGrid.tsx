import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  Mail,
  CalendarCheck,
  Trophy,
  TrendingUp,
  Sparkles,
  UserCheck,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { KPI_ACCENTS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useDashboardKpis } from "./useDashboard";

type KpiCardKey = keyof typeof KPI_ACCENTS;

const CARDS: Array<{
  key: KpiCardKey;
  label: string;
  shortLabel: string;
  periodScoped?: boolean;
  icon: LucideIcon;
  suffix?: string;
  href?: string;
}> = [
  { key: "totalLeads", label: "Total leads in pipeline", shortLabel: "Total Leads", icon: Users, href: "/pipeline" },
  {
    key: "qualifiedLeads",
    label: "Leads passed ICP qualification",
    shortLabel: "Qualified",
    icon: UserCheck,
    href: "/pipeline?status=qualified",
  },
  {
    key: "leadsCreatedInPeriod",
    label: "New leads added in range",
    shortLabel: "New Leads",
    periodScoped: true,
    icon: Sparkles,
    href: "/pipeline",
  },
  {
    key: "pendingApprovals",
    label: "Emails awaiting manager approval",
    shortLabel: "Approvals",
    icon: ShieldCheck,
    href: "/approval",
  },
  {
    key: "emailsSentInPeriod",
    label: "Outreach emails delivered",
    shortLabel: "Emails Sent",
    periodScoped: true,
    icon: Mail,
    href: "/pipeline?status=sent",
  },
  {
    key: "meetingsInPeriod",
    label: "Meetings scheduled in range",
    shortLabel: "Meetings",
    periodScoped: true,
    icon: CalendarCheck,
    href: "/pipeline?status=meeting",
  },
  { key: "dealsWon", label: "Closed-won opportunities", shortLabel: "Deals Won", icon: Trophy, href: "/pipeline?status=won" },
  { key: "overallConversionPct", label: "Win rate on closed deals", shortLabel: "Conversion", icon: TrendingUp, suffix: "%" },
];

function parseMetricValue(value: string | null, suffix?: string): number {
  if (!value) return 0;
  const raw = suffix ? value.replace(suffix, "") : value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function KpiCard({
  label,
  shortLabel,
  periodLabel,
  periodScoped,
  value,
  icon: Icon,
  accent,
  suffix,
  href,
  isLoading,
  index,
}: {
  label: string;
  shortLabel: string;
  periodLabel: string;
  periodScoped?: boolean;
  value: string | null;
  icon: LucideIcon;
  accent: (typeof KPI_ACCENTS)[KpiCardKey];
  href?: string;
  isLoading: boolean;
  index: number;
  suffix?: string;
}) {
  const metric = parseMetricValue(value, suffix);
  const isLive = metric > 0;

  const inner = (
    <div
      className={cn(
        "kpi-card group relative h-full min-h-[148px] overflow-hidden rounded-[1.35rem] p-[1px] transition-all duration-500",
        href && "cursor-pointer hover:scale-[1.01] hover:shadow-lg",
      )}
      style={{
        background: `linear-gradient(145deg, ${accent.from}40, ${accent.to}18, transparent 58%)`,
        boxShadow: isLive
          ? `0 6px 28px -8px ${accent.glow}, 0 0 0 1px ${accent.from}22`
          : `0 4px 18px -10px ${accent.glow}`,
        animationDelay: `${index * 55}ms`,
        ["--kpi-from" as string]: accent.from,
        ["--kpi-to" as string]: accent.to,
      }}
    >
      <div
        className={cn(
          "relative flex h-full flex-col justify-between overflow-hidden rounded-[1.3rem] bg-gradient-to-br from-card via-card to-card/95 px-5 py-5",
          "ring-1 ring-inset ring-white/[0.06]",
          href && "group-hover:from-card group-hover:to-card/90",
        )}
      >
        {/* Soft accent wash — visible but not hazy */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06] transition-opacity duration-300 group-hover:opacity-[0.09]"
          style={{ background: `linear-gradient(135deg, ${accent.from}, transparent 65%)` }}
        />

        {/* Corner glow — contained behind icon area */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-2xl"
          style={{ background: accent.soft, opacity: isLive ? 1 : 0.7 }}
        />
        <div
          className="pointer-events-none absolute -bottom-6 -left-6 h-16 w-16 rounded-full blur-xl opacity-30"
          style={{ background: accent.glow }}
        />

        {/* Bottom accent line */}
        <div
          className="pointer-events-none absolute inset-x-4 bottom-0 h-px opacity-50"
          style={{ background: `linear-gradient(90deg, transparent, ${accent.from}88, ${accent.to}88, transparent)` }}
        />

        {/* Top row */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-2xl blur-sm opacity-50 transition-opacity duration-300 group-hover:opacity-70"
              style={{ background: `linear-gradient(135deg, ${accent.from}, ${accent.to})` }}
            />
            <div
              className="relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ring-1 ring-white/20 transition-transform duration-300 group-hover:scale-[1.03]"
              style={{
                background: `linear-gradient(145deg, ${accent.from}, ${accent.to})`,
                boxShadow: `0 4px 14px -4px ${accent.glow}`,
              }}
            >
              <Icon className="h-5 w-5 text-white drop-shadow-sm" strokeWidth={2.25} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            {periodScoped && (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                style={{
                  background: accent.soft,
                  color: accent.from,
                  border: `1px solid ${accent.from}33`,
                }}
              >
                {periodLabel}
              </span>
            )}
            {href && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 bg-background/50 text-muted-foreground transition-all duration-300 group-hover:border-transparent group-hover:bg-[linear-gradient(135deg,var(--kpi-from),var(--kpi-to))] group-hover:text-white group-hover:shadow-md">
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
              </span>
            )}
          </div>
        </div>

        {/* Value block */}
        <div className="relative mt-5 space-y-1.5">
          <p
            className={cn(
              "text-[2rem] font-bold leading-none tabular-nums tracking-tight text-foreground",
              isLoading && "animate-pulse text-muted-foreground",
            )}
            title={label}
          >
            {value ?? "—"}
          </p>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-muted-foreground">{shortLabel}</p>
            {isLive && !isLoading && (
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: accent.from, boxShadow: `0 0 6px ${accent.glow}` }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className="kpi-card-rise block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-[1.35rem]"
      >
        {inner}
      </Link>
    );
  }

  return <div className="kpi-card-rise h-full">{inner}</div>;
}

export function KpiCardGrid({ params, periodLabel }: { params: DashboardQueryParams; periodLabel: string }) {
  const { data: kpis, isLoading, isError, refetch } = useDashboardKpis(params);

  if (isError) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
        Failed to load key metrics.{" "}
        <Button size="sm" variant="outline" className="ml-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(({ key, label, shortLabel, periodScoped, icon, suffix, href }, index) => {
        const accent = KPI_ACCENTS[key];
        const value = isLoading ? null : `${kpis?.[key] ?? 0}${suffix ?? ""}`;

        return (
          <KpiCard
            key={key}
            index={index}
            label={label}
            shortLabel={shortLabel}
            periodLabel={periodLabel}
            periodScoped={periodScoped}
            value={value}
            icon={icon}
            accent={accent}
            href={href}
            suffix={suffix}
            isLoading={isLoading}
          />
        );
      })}
    </div>
  );
}
