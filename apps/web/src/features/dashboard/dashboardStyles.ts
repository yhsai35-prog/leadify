export const INDUSTRY_COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
] as const;

export const KPI_ACCENTS = {
  totalLeads: { from: "#3b82f6", to: "#1d4ed8", glow: "rgba(59,130,246,0.26)", soft: "rgba(59,130,246,0.09)" },
  qualifiedLeads: { from: "#6366f1", to: "#4f46e5", glow: "rgba(99,102,241,0.26)", soft: "rgba(99,102,241,0.09)" },
  leadsCreatedInPeriod: { from: "#a855f7", to: "#7c3aed", glow: "rgba(168,85,247,0.26)", soft: "rgba(168,85,247,0.09)" },
  pendingApprovals: { from: "#f59e0b", to: "#d97706", glow: "rgba(245,158,11,0.26)", soft: "rgba(245,158,11,0.09)" },
  emailsSentInPeriod: { from: "#06b6d4", to: "#0891b2", glow: "rgba(6,182,212,0.26)", soft: "rgba(6,182,212,0.09)" },
  meetingsInPeriod: { from: "#8b5cf6", to: "#7c3aed", glow: "rgba(139,92,246,0.26)", soft: "rgba(139,92,246,0.09)" },
  dealsWon: { from: "#10b981", to: "#059669", glow: "rgba(16,185,129,0.26)", soft: "rgba(16,185,129,0.09)" },
  overallConversionPct: { from: "#14b8a6", to: "#0d9488", glow: "rgba(20,184,166,0.26)", soft: "rgba(20,184,166,0.09)" },
} as const;

export const BAR_GRADIENT_ID = "dashboard-bar-gradient";
export const FUNNEL_GRADIENT_ID = "dashboard-funnel-gradient";
