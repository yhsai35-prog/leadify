import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Mail } from "lucide-react";
import { ChartEmptyState } from "./ChartEmptyState";
import { ChartTooltip } from "./ChartTooltip";
import { DashboardChartCard } from "./DashboardChartCard";
import { INDUSTRY_COLORS } from "./dashboardStyles";
import type { DashboardQueryParams } from "./useDashboard";
import { useEmailEngagement } from "./useDashboard";

export function EmailEngagementCard({ params }: { params: DashboardQueryParams }) {
  const { data, isLoading, isError, refetch } = useEmailEngagement(params);

  const sentimentData = Object.entries(data?.sentiment ?? {}).map(([name, value]) => ({ name, value }));

  return (
    <DashboardChartCard title="Email engagement" description="Reply rate and sentiment for sent emails" icon={Mail}>
      {isError ? (
        <ChartEmptyState icon={Mail} message="Failed to load email engagement." onRetry={() => refetch()} />
      ) : isLoading ? (
        <ChartEmptyState icon={Mail} loading message="Loading email stats…" />
      ) : !data || data.emailsSent === 0 ? (
        <ChartEmptyState icon={Mail} message="Send outreach emails to track reply rates." />
      ) : (
        <div className="flex h-full flex-col gap-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold">{data.emailsSent}</p>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.repliesReceived}</p>
              <p className="text-xs text-muted-foreground">Replies</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{data.replyRate}%</p>
              <p className="text-xs text-muted-foreground">Reply rate</p>
            </div>
          </div>
          {sentimentData.length > 0 && (
            <ResponsiveContainer width="100%" height="55%">
              <PieChart>
                <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {sentimentData.map((_, index) => (
                    <Cell key={index} fill={INDUSTRY_COLORS[index % INDUSTRY_COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip labelKey="name" valueLabel="Replies" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </DashboardChartCard>
  );
}
