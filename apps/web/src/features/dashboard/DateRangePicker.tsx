import { cn } from "@/lib/utils";
import type { DateRangePreset } from "./useDashboardFilters";

const PRESETS: Array<{ id: DateRangePreset; label: string }> = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
];

export function DateRangePicker({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            value === preset.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
