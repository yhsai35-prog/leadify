import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { INDUSTRY_COLORS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useDiscoveryFunnel } from "./useDashboard";

export function DiscoveryFunnelChart({ params }: { params: DashboardQueryParams }) {
  const { data, isLoading, isError, refetch } = useDiscoveryFunnel(params);

  const chartData = data
    ? [
        { stage: "Pending", count: data.pending, key: "pending" },
        { stage: "Promoted", count: data.promoted, key: "promoted" },
        { stage: "Duplicate", count: data.duplicate, key: "duplicate" },
        { stage: "Failed", count: data.failed, key: "failed" },
      ]
    : [];

  const hasData = chartData.some((row) => row.count > 0);

  return (
    <DashboardChartCard
      title="Discovery funnel"
      description="Lead discovery outcomes in the selected period"
      icon={Search}
      action={
        <Link to="/discovery" className="text-xs text-primary hover:underline">
          Discover leads
        </Link>
      }
    >
      {isError ? (
        <ChartEmptyState icon={Search} message="Failed to load discovery stats." onRetry={() => refetch()} />
      ) : isLoading || !hasData ? (
        <ChartEmptyState icon={Search} loading={isLoading} message="Run Apollo discovery to populate this funnel." />
      ) : (
        <div className="flex h-full flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Promotion rate: <span className="font-medium text-foreground">{data?.promotionRate ?? 0}%</span> ({data?.total ?? 0} discovered)
          </p>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage" width={80} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip labelKey="stage" valueLabel="Leads" />} />
              <Bar dataKey="count" radius={[0, 8, 8, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={entry.key} fill={INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardChartCard>
  );
}
