import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Building2 } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { DashboardChartCard } from "./DashboardChartCard";
import type { DashboardQueryParams } from "./useDashboard";
import { useCityBreakdown } from "./useDashboard";

export function CityBarChart({ params }: { params: DashboardQueryParams }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useCityBreakdown(params);

  const chartData = (data ?? []).slice(0, 10);
  const otherCount = (data ?? []).slice(10).reduce((sum, row) => sum + row.count, 0);
  if (otherCount > 0) chartData.push({ city: "Other", state: "", count: otherCount });

  return (
    <DashboardChartCard title="Leads by City" description="City breakdown mapped to Indian states" icon={Building2}>
      {isError ? (
        <ChartEmptyState icon={Building2} message="Failed to load city breakdown." onRetry={() => refetch()} />
      ) : isLoading || chartData.length === 0 ? (
        <ChartEmptyState icon={Building2} loading={isLoading} message="City data appears once company metadata is enriched." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="city" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} angle={-25} textAnchor="end" height={56} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const row = payload[0].payload as { city: string; state: string; count: number };
                return (
                  <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-medium">{row.city}</p>
                    {row.state && <p className="text-muted-foreground">{row.state}</p>}
                    <p>{row.count} leads</p>
                  </div>
                );
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }}
            />
            <Bar
              dataKey="count"
              radius={[6, 6, 0, 0]}
              fill="#06b6d4"
              onClick={(row) => {
                if (row.city && row.city !== "Other" && row.city !== "Unknown") {
                  navigate(`/companies?search=${encodeURIComponent(row.city)}`);
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
