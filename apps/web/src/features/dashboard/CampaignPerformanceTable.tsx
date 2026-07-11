import { Link, useNavigate } from "react-router-dom";
import type { CampaignPerformanceRow } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { titleCase } from "@/lib/utils";
import type { DashboardQueryParams } from "./useDashboard";
import { useCampaignPerformance } from "./useDashboard";

const STATUS_VARIANT = {
  draft: "outline",
  active: "success",
  paused: "warning",
  completed: "secondary",
} as const;

export function CampaignPerformanceTable({ params }: { params: DashboardQueryParams }) {
  const navigate = useNavigate();
  const { data: rows, isLoading, isError, refetch } = useCampaignPerformance(params);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Campaign performance</CardTitle>
        <Link to="/campaigns" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-sm text-muted-foreground">
            Failed to load campaigns.{" "}
            <Button size="sm" variant="link" className="h-auto p-0" onClick={() => refetch()}>
              Retry
            </Button>
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading campaign performance…</p>
        ) : !rows || rows.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="text-sm text-muted-foreground">No active campaign activity in this view yet.</p>
            <Button asChild size="sm">
              <Link to="/campaigns">Create campaign</Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Pending</TableHead>
                <TableHead>At sent+</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: CampaignPerformanceRow) => (
                <TableRow
                  key={row.campaignId}
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => navigate(`/campaigns/${row.campaignId}`)}
                >
                  <TableCell>
                    <Link to={`/campaigns/${row.campaignId}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                      {row.campaignName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[row.status]}>{titleCase(row.status)}</Badge>
                  </TableCell>
                  <TableCell>{row.leadCount}</TableCell>
                  <TableCell>{row.emailsSent}</TableCell>
                  <TableCell>{row.pendingApproval}</TableCell>
                  <TableCell>{row.leadsAtSentPlus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
