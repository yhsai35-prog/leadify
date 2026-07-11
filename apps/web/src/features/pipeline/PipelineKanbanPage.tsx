import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { PIPELINE_ORDER, type PipelineStatus } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, titleCase } from "@/lib/utils";
import { ContactAckIcons } from "./ContactAckIcons";
import { PriorityBadge } from "./PriorityBadge";
import { usePipelineBoard } from "./usePipeline";

function matchesPipelineSearch(
  lead: {
    pipelineStatus: PipelineStatus;
    priority: string;
    icpScore: number | null;
    company?: { name?: string; industry?: string | null; domain?: string | null };
    contact?: { firstName?: string; lastName?: string | null; title?: string | null; email?: string | null };
  },
  query: string,
) {
  const haystack = [
    lead.company?.name,
    lead.company?.industry,
    lead.company?.domain,
    titleCase(lead.pipelineStatus),
    titleCase(lead.priority),
    lead.icpScore?.toString(),
    lead.contact?.firstName,
    lead.contact?.lastName,
    lead.contact?.title,
    lead.contact?.email,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function PipelineKanbanPage() {
  const { data: board, isLoading } = usePipelineBoard();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const statusFilter = searchParams.get("status") as PipelineStatus | null;
  const industryFilter = searchParams.get("industry");
  const searchQuery = search.trim().toLowerCase();

  const leads = useMemo(
    () =>
      PIPELINE_ORDER.flatMap((status) => board?.[status] ?? [])
        .filter((lead) => {
          if (statusFilter && lead.pipelineStatus !== statusFilter) return false;
          if (industryFilter && lead.company?.industry !== industryFilter) return false;
          if (searchQuery && !matchesPipelineSearch(lead, searchQuery)) return false;
          return true;
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [board, statusFilter, industryFilter, searchQuery],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          {statusFilter || industryFilter
            ? `Filtered view${statusFilter ? ` · ${titleCase(statusFilter)}` : ""}${industryFilter ? ` · ${industryFilter}` : ""}`
            : "Track every lead from import through to a closed deal."}
        </p>
        {statusFilter === "draft_ready" && (
          <p className="text-sm text-muted-foreground">
            Select a lead to review its email draft on the Outreach tab.
          </p>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by company, industry, contact, or status..."
          className="pl-9"
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pipeline...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {searchQuery || statusFilter || industryFilter
            ? "No leads match your current filters."
            : "No leads in the pipeline yet. Import companies from Lead Discovery."}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Employees</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>ICP Score</TableHead>
              <TableHead>Outreach</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow
                key={lead.id}
                className="cursor-pointer"
                onClick={() =>
                  navigate(
                    lead.pipelineStatus === "draft_ready"
                      ? `/pipeline/${lead.id}?tab=outreach`
                      : `/pipeline/${lead.id}`,
                  )
                }
              >
                <TableCell className="font-medium">{lead.company?.name ?? "Unknown company"}</TableCell>
                <TableCell>{lead.company?.industry ?? "—"}</TableCell>
                <TableCell>{lead.company?.employeeCount ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline">{titleCase(lead.pipelineStatus)}</Badge>
                </TableCell>
                <TableCell>
                  <PriorityBadge priority={lead.priority} />
                </TableCell>
                <TableCell>
                  {lead.icpScore !== null ? (
                    <Badge variant={lead.icpScore >= 70 ? "success" : lead.icpScore >= 50 ? "warning" : "outline"}>
                      {lead.icpScore}
                    </Badge>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {lead.contactId ? <ContactAckIcons leadId={lead.id} contactId={lead.contactId} /> : "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(lead.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
