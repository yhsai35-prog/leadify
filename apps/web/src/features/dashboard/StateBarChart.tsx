import { useNavigate } from "react-router-dom";
import { bucketTopN } from "@bluwheelz/shared";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MapPin } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { BAR_GRADIENT_ID } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useStateBreakdown } from "./useDashboard";

export function StateBarChart({ params }: { params: DashboardQueryParams }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useStateBreakdown(params);

  const bucketed = bucketTopN(data ?? {}, 10);
  const chartData = Object.entries(bucketed)
    .map(([state, count]) => ({ state, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <DashboardChartCard title="Leads by State" description="State-level concentration of your pipeline" icon={MapPin}>
      {isError ? (
        <ChartEmptyState icon={MapPin} message="Failed to load state breakdown." onRetry={() => refetch()} />
      ) : isLoading || chartData.length === 0 ? (
        <ChartEmptyState icon={MapPin} loading={isLoading} message="Geographic data appears once company locations are enriched." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ bottom: 20 }}>
            <defs>
              <linearGradient id={BAR_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="state" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" height={56} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip labelKey="state" valueLabel="Leads" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              fill={`url(#${BAR_GRADIENT_ID})`}
              onClick={(row) => {
                if (row.state && row.state !== "Other" && row.state !== "Unknown") {
                  navigate(`/companies?search=${encodeURIComponent(row.state)}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {chartData.map((_, index) => (
                <Cell key={index} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </DashboardChartCard>
  );
}
