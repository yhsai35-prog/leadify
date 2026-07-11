import type { TooltipProps } from "recharts";

interface ChartTooltipProps extends TooltipProps<number, string> {
  labelKey?: string;
  valueLabel?: string;
  sublabel?: (payload: Record<string, unknown>) => string | undefined;
}

export function ChartTooltip({ active, payload, label, labelKey, valueLabel = "Count", sublabel }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload as Record<string, unknown>;
  const displayLabel = label ?? (labelKey ? String(row[labelKey] ?? "") : "");
  const value = payload[0]?.value ?? 0;
  const secondary = sublabel?.(row);

  return (
    <div className="rounded-xl border border-border/80 bg-card/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md">
      <p className="font-semibold text-foreground">{displayLabel}</p>
      {secondary && <p className="text-muted-foreground">{secondary}</p>}
      <p className="mt-1.5 text-primary">
        {valueLabel}: <span className="font-bold text-foreground">{value}</span>
      </p>
    </div>
  );
}
