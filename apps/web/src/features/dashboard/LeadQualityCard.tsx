import { BarChart3 } from "lucide-react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { INDUSTRY_COLORS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useLeadQuality } from "./useDashboard";

export function LeadQualityCard({ params }: { params: DashboardQueryParams }) {
  const { data, isLoading, isError, refetch } = useLeadQuality(params);

  const icpData = Object.entries(data?.icpBuckets ?? {}).map(([name, value]) => ({ name, value }));
  const hasData = icpData.some((row) => row.value > 0);

  return (
    <DashboardChartCard title="Lead quality" description="ICP score distribution across active pipeline" icon={BarChart3}>
      {isError ? (
        <ChartEmptyState icon={BarChart3} message="Failed to load lead quality." onRetry={() => refetch()} />
      ) : isLoading || !hasData ? (
        <ChartEmptyState icon={BarChart3} loading={isLoading} message="Qualify leads to see ICP score distribution." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={icpData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {icpData.map((_, index) => (
                <Cell key={index} fill={INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip labelKey="name" valueLabel="Leads" />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </DashboardChartCard>
  );
}
