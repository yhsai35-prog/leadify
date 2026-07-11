import { useMemo, useState } from "react";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { useAuth } from "@/hooks/useAuth";

export type DateRangePreset = "7d" | "30d" | "90d";

function presetToRange(preset: DateRangePreset): { from: string; to: string } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to);
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  from.setDate(from.getDate() - days);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function useDashboardFilters() {
  const { user } = useAuth();
  const canDrillDown = Boolean(user && ROLE_RANK[user.role] >= ROLE_RANK[UserRole.ADMIN]);
  const [preset, setPreset] = useState<DateRangePreset>("30d");
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);

  const { from, to } = useMemo(() => presetToRange(preset), [preset]);

  const scopeLabel = canDrillDown
    ? selectedUserId
      ? "Filtered to selected rep"
      : "Organization overview"
    : "Your assigned pipeline";

  const subtitle = canDrillDown
    ? "Executive overview of pipeline health, outreach performance, and team activity."
    : "Your daily work queue, pipeline progress, and outreach performance.";

  return {
    canDrillDown,
    preset,
    setPreset,
    from,
    to,
    selectedUserId,
    setSelectedUserId,
    userId: canDrillDown ? selectedUserId : undefined,
    scopeLabel,
    subtitle,
  };
}

export type DashboardFiltersState = ReturnType<typeof useDashboardFilters>;
