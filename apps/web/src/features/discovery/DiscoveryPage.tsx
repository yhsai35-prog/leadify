import { useMemo, useState } from "react";
import { TARGET_DECISION_MAKER_TITLES } from "@bluwheelz/shared";
import { useToast } from "@/components/ui/toast";
import { DISCOVERY_ERRORS, getUserFriendlyError } from "@/lib/userFriendlyError";
import { ApolloSearchForm, type ApolloSearchFormValues } from "./ApolloSearchForm";
import { DiscoverySearchLoading } from "./DiscoverySearchLoading";
import { loadDiscoveryState, saveDiscoveryState } from "./discoveryState";
import { SearchResultsTable } from "./SearchResultsTable";
import { useApolloSearch, type ApolloOrganizationResult, type ApolloPersonResult } from "./useDiscovery";

export function DiscoveryPage() {
  const savedForm = useMemo(() => loadDiscoveryState()?.form, []);
  const [results, setResults] = useState<{
    organizations: ApolloOrganizationResult[];
    people: ApolloPersonResult[];
    totalResults?: number;
    savedCount?: number;
    hasSearched?: boolean;
  }>(() => {
    const saved = loadDiscoveryState()?.results;
    return saved ? { ...saved, hasSearched: true } : { organizations: [], people: [] };
  });
  const search = useApolloSearch();
  const { toast } = useToast();

  const handleSearch = (values: ApolloSearchFormValues) => {
    search.mutate(
      {
        industries: values.industries,
        locations: values.location ? [values.location] : undefined,
        titles: [...TARGET_DECISION_MAKER_TITLES],
        page: 1,
        perPage: 10,
      },
      {
        onSuccess: (data) => {
          const next = { ...data, hasSearched: true };
          setResults(next);
          saveDiscoveryState({ form: values, results: next });
          const found = data.organizations.length;
          const saved = data.savedCount ?? found;
          if (found === 0) {
            toast({
              title: "No matches",
              description:
                "Apollo returned no companies for this search. Try a different industry or state.",
              variant: "info",
            });
            return;
          }
          toast({
            title: "Leads saved",
            description: `${saved} ${saved === 1 ? "lead" : "leads"} saved to Leads Found. Review and add them to your pipeline.`,
            variant: "success",
          });
        },
        onError: (err) =>
          toast({
            title: DISCOVERY_ERRORS.searchTitle,
            description: getUserFriendlyError(err, DISCOVERY_ERRORS.searchFallback),
            variant: "error",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Lead Discovery</h1>
        <p className="text-sm text-muted-foreground">
          Search Database for up to 10 new companies per search. Results are automatically saved to Leads Found.
          Repeat searches with the same filters skip companies you have already discovered.
        </p>
      </div>
      <ApolloSearchForm onSearch={handleSearch} isSearching={search.isPending} defaultValues={savedForm} />
      {search.isPending ? (
        <DiscoverySearchLoading />
      ) : (
        <SearchResultsTable
          organizations={results.organizations}
          people={results.people}
          totalResults={results.totalResults}
          savedCount={results.savedCount}
          hasSearched={results.hasSearched}
        />
      )}
    </div>
  );
}
