import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { DISCOVERY_INDUSTRY_GROUPS, INDIAN_STATES, discoveryIndustriesForGroup, inferDiscoveryCategory } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ApolloSearchFormValues {
  category: string;
  industries: string[];
  location: string;
}

function IndustryMultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  };

  const triggerLabel =
    selected.length === 0
      ? "Select industries"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} industries selected`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal text-foreground"
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-72 w-64 overflow-y-auto" align="start">
        <div className="flex items-center justify-between px-2 py-1">
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => onChange(options)}
          >
            Select all
          </button>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:underline"
            onClick={() => onChange([])}
          >
            Clear
          </button>
        </div>
        <DropdownMenuSeparator />
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <DropdownMenuItem
              key={option}
              onSelect={(e) => {
                e.preventDefault();
                toggle(option);
              }}
            >
              <span
                className={cn(
                  "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-input",
                  isSelected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {isSelected && <Check className="h-3 w-3" />}
              </span>
              {option}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ApolloSearchForm({
  onSearch,
  isSearching,
  defaultValues,
}: {
  onSearch: (values: ApolloSearchFormValues) => void;
  isSearching: boolean;
  defaultValues?: ApolloSearchFormValues;
}) {
  const [category, setCategory] = useState<string>(
    () => defaultValues?.category ?? inferDiscoveryCategory(defaultValues?.industries?.[0]),
  );
  const [industries, setIndustries] = useState<string[]>(defaultValues?.industries ?? []);
  const [location, setLocation] = useState<string>(defaultValues?.location ?? "India");

  const industryOptions = discoveryIndustriesForGroup(category);

  useEffect(() => {
    // Drop any selected industries that no longer belong to the current category.
    setIndustries((prev) => prev.filter((i) => industryOptions.includes(i)));
  }, [category, industryOptions]);

  const handleCategoryChange = (next: string) => {
    setCategory(next);
    setIndustries([]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (industries.length === 0) return;
    onSearch({ category, industries, location });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISCOVERY_INDUSTRY_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <IndustryMultiSelect options={industryOptions} selected={industries} onChange={setIndustries} />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="India">All India</SelectItem>
                {INDIAN_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full gap-2" disabled={isSearching || industries.length === 0}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isSearching ? "Searching..." : "Search Database"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
