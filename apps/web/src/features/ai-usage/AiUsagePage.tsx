import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, Gauge, Sparkles, Users as UsersIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { titleCase } from "@/lib/utils";
import { ChartEmptyState } from "@/features/dashboard/ChartEmptyState";
import { ChartTooltip } from "@/features/dashboard/ChartTooltip";
import { DashboardChartCard } from "@/features/dashboard/DashboardChartCard";
import { useAiUsageByUser, useAiUsageSummary } from "./useAiUsage";

export function AiUsagePage() {
  const { data: summary, isLoading: summaryLoading } = useAiUsageSummary();
  const { data: byUser, isLoading: byUserLoading } = useAiUsageByUser();

  const totalApollo = summary?.filter((s) => s.provider === "apollo").reduce((sum, s) => sum + s.count, 0) ?? 0;
  const totalClaude = summary?.filter((s) => s.provider === "claude").reduce((sum, s) => sum + s.count, 0) ?? 0;
  const totalCalls = totalApollo + totalClaude;
  const uniqueUsers = new Set(byUser?.map((row) => row.userId)).size;

  const userNames = Array.from(new Set(byUser?.map((row) => row.userName) ?? []));
  const chartData = userNames.map((name) => {
    const rows = byUser?.filter((r) => r.userName === name) ?? [];
    return {
      name,
      apollo: rows.find((r) => r.provider === "apollo")?.count ?? 0,
      claude: rows.find((r) => r.provider === "claude")?.count ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Gauge className="h-6 w-6 text-primary" />
          AI Credit Usage
        </h1>
        <p className="text-sm text-muted-foreground">Call counters for Apollo and Claude, broken down per teammate.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total AI Calls", value: totalCalls, icon: Sparkles },
          { label: "Apollo Calls", value: totalApollo, icon: Gauge },
          { label: "Claude Calls", value: totalClaude, icon: Bot },
          { label: "Active Users", value: uniqueUsers, icon: UsersIcon },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold tracking-tight">{summaryLoading || byUserLoading ? "—" : value}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <DashboardChartCard title="Calls per User" description="Apollo vs. Claude call volume by teammate" icon={UsersIcon}>
        {byUserLoading || chartData.length === 0 ? (
          <ChartEmptyState icon={UsersIcon} loading={byUserLoading} message="Usage appears once teammates run searches or AI actions." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={0} angle={-22} textAnchor="end" height={56} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip labelKey="name" valueLabel="Calls" />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="apollo" name="Apollo" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="claude" name="Claude" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </DashboardChartCard>

      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Breakdown by action</h2>
        {summaryLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !summary || summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="text-right">Calls</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((row) => (
                <TableRow key={`${row.provider}:${row.action}`}>
                  <TableCell className="capitalize">{row.provider}</TableCell>
                  <TableCell>{titleCase(row.action)}</TableCell>
                  <TableCell className="text-right font-medium">{row.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
