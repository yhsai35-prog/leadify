import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExternalLink, GitCompareArrows, Search } from "lucide-react";
import type { ExistingClientVertical, PipelineStatus, Priority, SimilarProspectMatch } from "@bluwheelz/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge } from "@/features/pipeline/PriorityBadge";
import { PipelineStatusBadge } from "@/features/pipeline/PipelineStatusBadge";
import {
  ALL_VERTICALS,
  formatVertical,
  matchPctVariant,
  useExistingClients,
  useSimilarProspects,
  VERTICAL_BADGE_VARIANT,
} from "./useSimilarity";

type SortKey = "match" | "icp" | "name";

function sortProspects(prospects: SimilarProspectMatch[], sortBy: SortKey): SimilarProspectMatch[] {
  return [...prospects].sort((a, b) => {
    if (sortBy === "match") return b.similarityPct - a.similarityPct;
    if (sortBy === "icp") return (b.icpScore ?? -1) - (a.icpScore ?? -1);
    return a.companyName.localeCompare(b.companyName);
  });
}

export function SimilarityPage() {
  const navigate = useNavigate();
  const { data: clientsData, isLoading: clientsLoading } = useExistingClients();

  const [searchInput, setSearchInput] = useState("");
  const [activeClient, setActiveClient] = useState<string | undefined>();
  const [verticalFilter, setVerticalFilter] = useState<ExistingClientVertical | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("match");
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());

  const { data: prospectsData, isLoading: prospectsLoading } = useSimilarProspects(activeClient);

  const clients = clientsData?.clients ?? [];
  const coverage = clientsData?.coverage;

  const filteredClients = useMemo(() => {
    const term = searchInput.trim().toLowerCase();
    return clients.filter((c) => {
      if (verticalFilter !== "all" && c.vertical !== verticalFilter) return false;
      if (term && !c.companyName.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [clients, searchInput, verticalFilter]);

  const activeClientData = useMemo(
    () => clients.find((c) => c.companyName === activeClient),
    [clients, activeClient],
  );

  const sortedProspects = useMemo(
    () => (prospectsData?.prospects ? sortProspects(prospectsData.prospects, sortBy) : []),
    [prospectsData?.prospects, sortBy],
  );

  const selectClient = (name: string) => {
    setActiveClient(name);
    setSearchInput(name);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = searchInput.trim();
    if (trimmed) setActiveClient(trimmed);
  };

  function toggleReason(leadId: string) {
    setExpandedReasons((prev) => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Existing Client Similarity</h1>
        <p className="text-sm text-muted-foreground">
          Reference knowledge base of your existing customers. Click a client or search below to find
          pipeline prospects that match them. For per-lead similarity details and AI reasoning, open a prospect in{" "}
          <Link to="/pipeline" className="text-primary hover:underline">
            Pipeline
          </Link>{" "}
          and view the <strong>Similar Client</strong> card on the lead detail page.
        </p>
        {coverage && coverage.totalLeads > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {coverage.leadsWithSimilarity} of {coverage.totalLeads} pipeline leads have similarity computed.
          </p>
        )}
      </div>

      <form onSubmit={handleSearch} className="flex max-w-md gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Find prospects like Delhivery"
          list="existing-client-names"
        />
        <datalist id="existing-client-names">
          {clients.map((c) => (
            <option key={c.companyId} value={c.companyName} />
          ))}
        </datalist>
        <Button type="submit" variant="secondary">
          <Search className="mr-1 h-4 w-4" />
          Search
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={verticalFilter === "all" ? "default" : "outline"}
          onClick={() => setVerticalFilter("all")}
        >
          All ({clients.length})
        </Button>
        {ALL_VERTICALS.map((v) => {
          const count = clients.filter((c) => c.vertical === v).length;
          if (count === 0) return null;
          return (
            <Button
              key={v}
              type="button"
              size="sm"
              variant={verticalFilter === v ? "default" : "outline"}
              onClick={() => setVerticalFilter(v)}
            >
              {formatVertical(v)} ({count})
            </Button>
          );
        })}
      </div>

      {clientsLoading ? (
        <p className="text-sm text-muted-foreground">Loading existing clients...</p>
      ) : filteredClients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No clients match your filter. Try a different vertical or search term.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {filteredClients.map((client) => (
            <Card
              key={client.companyId}
              className={`cursor-pointer transition-colors hover:border-primary/50 ${activeClient === client.companyName ? "border-primary ring-1 ring-primary/30" : ""}`}
              onClick={() => selectClient(client.companyName)}
            >
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="flex min-w-0 items-center gap-2">
                  <GitCompareArrows className="h-4 w-4 shrink-0 text-primary" />
                  <CardTitle className="truncate text-sm">{client.companyName}</CardTitle>
                </div>
                <Link
                  to={`/companies/${client.companyId}`}
                  state={{ from: "/similarity" }}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-muted-foreground hover:text-primary"
                  title="View company profile"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </CardHeader>
              <CardContent className="space-y-2">
                <Badge variant={VERTICAL_BADGE_VARIANT[client.vertical]}>{formatVertical(client.vertical)}</Badge>
                <p className="text-xs text-muted-foreground">
                  {client.prospectMatchCount > 0
                    ? `${client.prospectMatchCount} prospect${client.prospectMatchCount === 1 ? "" : "s"}`
                    : "No matches yet"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeClient && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prospects similar to {prospectsData?.client?.companyName ?? activeClient}
            </CardTitle>
            {(activeClientData ?? prospectsData?.client) && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  {activeClientData && (
                    <Badge variant={VERTICAL_BADGE_VARIANT[activeClientData.vertical]}>
                      {formatVertical(activeClientData.vertical)}
                    </Badge>
                  )}
                  {!activeClientData && prospectsData?.client && (
                    <Badge variant="outline">{formatVertical(prospectsData.client.vertical)}</Badge>
                  )}
                  {activeClientData && (
                    <Link to={`/companies/${activeClientData.companyId}`} className="text-primary hover:underline">
                      View company profile
                    </Link>
                  )}
                </div>
                <p className="line-clamp-3">{(activeClientData ?? prospectsData?.client)?.profileSummary}</p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {prospectsLoading ? (
              <p className="text-sm text-muted-foreground">Searching pipeline matches...</p>
            ) : !prospectsData?.client ? (
              <p className="text-sm text-muted-foreground">
                No existing client matched &quot;{activeClient}&quot;. Pick a name from the grid above or use the
                search autocomplete (e.g. Delhivery, Blue Dart).
              </p>
            ) : prospectsData.prospects.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  No pipeline prospects matched {prospectsData.client.companyName} yet. Similarity is computed per lead
                  in Pipeline.
                </p>
                <p>
                  Go to{" "}
                  <Link to="/pipeline" className="text-primary hover:underline">
                    Pipeline
                  </Link>
                  , open a lead, and click <strong>Recompute</strong> on the Similar Client card to generate matches.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-end">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">Sort by match %</SelectItem>
                      <SelectItem value="icp">Sort by ICP score</SelectItem>
                      <SelectItem value="name">Sort by company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedProspects.map((p) => (
                      <TableRow
                        key={p.leadId}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/pipeline/${p.leadId}`)}
                      >
                        <TableCell className="font-medium">{p.companyName}</TableCell>
                        <TableCell className="text-muted-foreground">{p.industry ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={matchPctVariant(p.similarityPct)}>{p.similarityPct}%</Badge>
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={p.priority as Priority} />
                        </TableCell>
                        <TableCell>
                          <PipelineStatusBadge status={p.pipelineStatus as PipelineStatus} />
                        </TableCell>
                        <TableCell
                          className="max-w-xs text-muted-foreground"
                          title={p.reason}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleReason(p.leadId);
                          }}
                        >
                          <span className={expandedReasons.has(p.leadId) ? "" : "line-clamp-2"}>{p.reason}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
