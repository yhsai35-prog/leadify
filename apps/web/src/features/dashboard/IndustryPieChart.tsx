import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { bucketTopN } from "@bluwheelz/shared";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { INDUSTRY_COLORS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useIndustryBreakdown } from "./useDashboard";

function ActiveSlice(props: { cx?: number; cy?: number; innerRadius?: number; outerRadius?: number; startAngle?: number; endAngle?: number; fill?: string }) {
  const { cx = 0, cy = 0, innerRadius = 0, outerRadius = 0, startAngle = 0, endAngle = 0, fill } = props;
  return (
    <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={(outerRadius as number) + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={1} />
  );
}

export function IndustryPieChart({ params }: { params: DashboardQueryParams }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useIndustryBreakdown(params);
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const bucketed = bucketTopN(data ?? {}, 8);
  const chartData = Object.entries(bucketed).map(([name, value]) => ({ name, value }));

  return (
    <DashboardChartCard title="Leads by Industry" description="ICP mix across your active pipeline" icon={PieChartIcon}>
      {isError ? (
        <ChartEmptyState icon={PieChartIcon} message="Failed to load industry breakdown." onRetry={() => refetch()} />
      ) : isLoading || chartData.length === 0 ? (
        <ChartEmptyState icon={PieChartIcon} loading={isLoading} message="Industry breakdown appears after leads are imported." />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={96}
              paddingAngle={3}
              animationDuration={900}
              activeIndex={activeIndex}
              activeShape={ActiveSlice}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(undefined)}
              onClick={(_, index) => {
                const industry = chartData[index]?.name;
                if (industry && industry !== "Other") {
                  navigate(`/pipeline?industry=${encodeURIComponent(industry)}`);
                }
              }}
              style={{ cursor: "pointer" }}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip labelKey="name" valueLabel="Leads" />} />
            <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 12 }} formatter={(value) => <span className="text-muted-foreground">{value}</span>} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </DashboardChartCard>
  );
}
