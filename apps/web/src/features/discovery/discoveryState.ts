import type { ApolloSearchFormValues } from "./ApolloSearchForm";
import type { ApolloOrganizationResult, ApolloPersonResult } from "./useDiscovery";

const STORAGE_KEY = "leadify-discovery-state";

interface DiscoveryPersistedState {
  form: ApolloSearchFormValues;
  results: {
    organizations: ApolloOrganizationResult[];
    people: ApolloPersonResult[];
    totalResults?: number;
  };
}

export function loadDiscoveryState(): DiscoveryPersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DiscoveryPersistedState;
  } catch {
    return null;
  }
}

export function saveDiscoveryState(state: DiscoveryPersistedState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private browsing errors.
  }
}
