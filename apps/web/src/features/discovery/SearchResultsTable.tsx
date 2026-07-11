import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApolloOrganizationResult, ApolloPersonResult } from "./useDiscovery";

interface Props {
  organizations: ApolloOrganizationResult[];
  people: ApolloPersonResult[];
  totalResults?: number;
  savedCount?: number;
  hasSearched?: boolean;
}

export function SearchResultsTable({ organizations, people, totalResults, savedCount, hasSearched }: Props) {
  if (organizations.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {hasSearched
          ? "No companies matched this search. Try another industry or state."
          : "Run a search to discover companies matching your ICP."}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Preview of latest search
          {savedCount != null ? ` · ${savedCount} saved to Leads Found` : ""}
          {totalResults != null && totalResults > organizations.length
            ? ` · ${totalResults} total Apollo matches`
            : ""}
        </p>
        <Button asChild size="sm" variant="outline" className="gap-2">
          <Link to="/leads-found">
            View all in Leads Found
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Industry</TableHead>
            <TableHead>City</TableHead>
            <TableHead>Decision Makers Found</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org) => {
            const orgPeople = people.filter((p) => p.organizationApolloId === org.apolloId);
            return (
              <TableRow key={org.apolloId}>
                <TableCell className="font-medium">
                  {org.name}
                  {org.domain && <div className="text-xs text-muted-foreground">{org.domain}</div>}
                </TableCell>
                <TableCell>{org.industry ?? "—"}</TableCell>
                <TableCell>{org.city ?? "—"}</TableCell>
                <TableCell>
                  {orgPeople.length > 0 ? (
                    <div className="space-y-1">
                      <Badge variant="success">{orgPeople.length}</Badge>
                      <p className="text-xs text-muted-foreground">
                        {orgPeople.filter((p) => p.hasEmail).length} email available on promote
                      </p>
                    </div>
                  ) : (
                    <Badge variant="outline">0</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
