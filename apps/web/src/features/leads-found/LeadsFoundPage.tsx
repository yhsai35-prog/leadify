import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Inbox, Loader2 } from "lucide-react";
import { DiscoveredLeadStatus } from "@bluwheelz/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatDate, titleCase } from "@/lib/utils";
import { getUserFriendlyError } from "@/lib/userFriendlyError";
import { useDiscoveredLeads, usePromoteDiscoveredLeads } from "./useLeadsFound";
import { LeadsFoundPromoteLoading } from "./LeadsFoundPromoteLoading";

type FilterTab = "all" | "pending" | "promoted";

function statusBadge(status: string) {
  switch (status) {
    case DiscoveredLeadStatus.PENDING:
      return <Badge variant="warning">Pending</Badge>;
    case DiscoveredLeadStatus.PROMOTED:
      return <Badge variant="success">In Pipeline</Badge>;
    case DiscoveredLeadStatus.DUPLICATE:
      return <Badge variant="outline">Already in workspace</Badge>;
    case DiscoveredLeadStatus.FAILED:
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{titleCase(status)}</Badge>;
  }
}

export function LeadsFoundPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const limit = 50;
  const { toast } = useToast();
  const promote = usePromoteDiscoveredLeads();

  const statusFilter =
    filter === "pending"
      ? DiscoveredLeadStatus.PENDING
      : filter === "promoted"
        ? DiscoveredLeadStatus.PROMOTED
        : undefined;

  const { data: response, isLoading } = useDiscoveredLeads(statusFilter, page, limit);
  const leads = response?.data ?? [];
  const total = response?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const visibleLeads = useMemo(() => {
    if (filter !== "all") return leads ?? [];
    return leads ?? [];
  }, [filter, leads]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePromote = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    promote.mutate(ids, {
      onSuccess: (result) => {
        const failed = result.failed?.length ?? 0;
        const added = result.promoted?.length ?? 0;
        setSelected(new Set());
        toast({
          title: failed > 0 ? "Partially added to pipeline" : "Added to pipeline",
          description:
            failed > 0
              ? `${added} companies added. ${failed} could not be added.`
              : `${added} ${added === 1 ? "company" : "companies"} added to your pipeline and companies list.`,
          variant: failed > 0 ? "info" : "success",
        });
      },
      onError: (err) =>
        toast({
          title: "Could not add to pipeline",
          description: getUserFriendlyError(err, "Try again or select fewer companies."),
          variant: "error",
        }),
    });
  };

  const selectableCount = visibleLeads.filter(
    (l) => l.status === DiscoveredLeadStatus.PENDING || l.status === DiscoveredLeadStatus.FAILED,
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads Found</h1>
          <p className="text-sm text-muted-foreground">
            All companies in your workspace from Apollo searches, imports, and pipeline. Select pending leads and add
            them to your pipeline.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Total found: <span className="font-medium text-foreground">{total}</span>
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link to="/discovery">
            Search more leads
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as FilterTab);
          setPage(1);
          setSelected(new Set());
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="promoted">In Pipeline</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading discovered leads...</p>
      ) : visibleLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No discovered leads yet. Run a search from Lead Discovery.</p>
          <Button asChild size="sm">
            <Link to="/discovery">Go to Lead Discovery</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {selected.size} selected · {selectableCount} available to add
            </p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page <span className="font-medium text-foreground">{page}</span> / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
              <Button size="sm" className="gap-2" disabled={selected.size === 0 || promote.isPending} onClick={handlePromote}>
                {promote.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {promote.isPending ? "Adding..." : "Add to Pipeline"}
              </Button>
            </div>
          </div>
          {promote.isPending ? (
            <LeadsFoundPromoteLoading count={selected.size} />
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>City</TableHead>
                <TableHead>State</TableHead>
                <TableHead>POCs</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Discovered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleLeads.map((lead) => {
                const canSelect =
                  lead.status === DiscoveredLeadStatus.PENDING || lead.status === DiscoveredLeadStatus.FAILED;
                const canOpenLead = lead.status === DiscoveredLeadStatus.PROMOTED && Boolean(lead.leadId);
                return (
                  <TableRow
                    key={lead.id}
                    className={canSelect || canOpenLead ? "cursor-pointer" : undefined}
                    onClick={() => {
                      if (canOpenLead && lead.leadId) {
                        navigate(`/pipeline/${lead.leadId}?tab=outreach`);
                        return;
                      }
                      if (canSelect) toggle(lead.id);
                    }}
                  >
                    <TableCell>
                      {canSelect ? (
                        <input
                          type="checkbox"
                          checked={selected.has(lead.id)}
                          onChange={() => toggle(lead.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.companyName}
                      {lead.domain && <div className="text-xs text-muted-foreground">{lead.domain}</div>}
                    </TableCell>
                    <TableCell>{lead.industry ?? lead.searchIndustry ?? "—"}</TableCell>
                    <TableCell>{lead.city ?? "—"}</TableCell>
                    <TableCell>{lead.searchState ?? "—"}</TableCell>
                    <TableCell>{lead.people.length || lead.contactCount || 0}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {statusBadge(lead.status)}
                        {lead.failureReason && (
                          <p className="text-xs text-muted-foreground">{lead.failureReason}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(lead.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          )}
        </div>
      )}
    </div>
  );
}
