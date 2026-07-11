import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PIPELINE_ORDER } from "@bluwheelz/shared";
import { Filter } from "lucide-react";
import { titleCase } from "@/lib/utils";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { INDUSTRY_COLORS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useFunnelConversion, usePipelineFunnel } from "./useDashboard";

export function ConversionFunnelChart({ params }: { params: DashboardQueryParams }) {
  const { data: funnel, isLoading: funnelLoading, isError: funnelError, refetch } = usePipelineFunnel(params);
  const { data: conversion } = useFunnelConversion(params);

  const chartData = PIPELINE_ORDER.map((status, index) => {
    const step = conversion?.find((s) => s.fromStage === status);
    return {
      stage: titleCase(status),
      status,
      count: funnel?.[status] ?? 0,
      conversionPct: step?.conversionPct ?? null,
      fill: INDUSTRY_COLORS[index % INDUSTRY_COLORS.length],
    };
  });

  const hasData = chartData.some((row) => row.count > 0);

  return (
    <DashboardChartCard
      title="Pipeline funnel"
      description="Lead volume by stage with step conversion rates"
      icon={Filter}
    >
      {funnelError ? (
        <ChartEmptyState icon={Filter} message="Failed to load funnel." onRetry={() => refetch()} />
      ) : funnelLoading || !hasData ? (
        <ChartEmptyState icon={Filter} loading={funnelLoading} message="Import leads to see your pipeline funnel." />
      ) : (
        <div className="flex h-full flex-col gap-2">
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" width={108} tick={{ fontSize: 11, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip labelKey="stage" valueLabel="Leads" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={16}>
                {chartData.map((entry) => (
                  <Cell key={entry.stage} fill={entry.count > 0 ? entry.fill : "hsl(var(--muted))"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 px-1 text-[11px] text-muted-foreground">
            {chartData
              .filter((row) => row.conversionPct != null && row.count > 0)
              .slice(0, 4)
              .map((row) => (
                <Link
                  key={row.status}
                  to={`/pipeline?status=${row.status}`}
                  className="rounded-md border border-border/60 px-2 py-0.5 hover:border-primary/40 hover:text-primary"
                >
                  {row.stage} → {row.conversionPct}%
                </Link>
              ))}
          </div>
        </div>
      )}
    </DashboardChartCard>
  );
}
