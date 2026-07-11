import { Link } from "react-router-dom";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DashboardQueryParams } from "./useDashboard";
import { useRepPerformance } from "./useDashboard";

export function RepLeaderboardTable({ params }: { params: DashboardQueryParams }) {
  const { data: rows, isLoading, isError, refetch } = useRepPerformance(params);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Team performance</CardTitle>
        </div>
        <Link to="/pipeline" className="text-sm text-primary hover:underline">
          View pipeline
        </Link>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Failed to load team stats.{" "}
            <button type="button" className="text-primary hover:underline" onClick={() => refetch()}>
              Retry
            </button>
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading team performance…</p>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rep activity in this period yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rep</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Won</TableHead>
                <TableHead>Conv.</TableHead>
                <TableHead>Emails</TableHead>
                <TableHead>Pending</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="font-medium">{row.userName}</TableCell>
                  <TableCell>{row.totalLeads}</TableCell>
                  <TableCell>{row.won}</TableCell>
                  <TableCell>{row.conversionPct}%</TableCell>
                  <TableCell>{row.emailsSent}</TableCell>
                  <TableCell>{row.pendingApprovals}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
