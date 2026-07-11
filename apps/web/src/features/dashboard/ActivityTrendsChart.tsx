import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import type { DashboardQueryParams } from "./useDashboard";
import { useActivityTrends } from "./useDashboard";

export function ActivityTrendsChart({ params }: { params: DashboardQueryParams }) {
  const { data, isLoading, isError, refetch } = useActivityTrends(params);

  const chartData = (data ?? []).map((point) => ({
    ...point,
    weekLabel: new Date(point.week).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  return (
    <DashboardChartCard
      title="Activity trends"
      description="Weekly leads created, emails sent, and deals won"
      icon={TrendingUp}
    >
      {isError ? (
        <ChartEmptyState icon={TrendingUp} message="Failed to load trends." onRetry={() => refetch()} />
      ) : isLoading || chartData.length === 0 ? (
        <ChartEmptyState icon={TrendingUp} loading={isLoading} message="Activity trends appear once leads move through the pipeline." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip labelKey="weekLabel" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="leadsCreated" name="Leads created" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="emailsSent" name="Emails sent" stroke="#06b6d4" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="dealsWon" name="Deals won" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </DashboardChartCard>
  );
}
