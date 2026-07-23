import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Inbox,
  Building2,
  GitCompareArrows,
  Mail,
  ShieldCheck,
  Megaphone,
  Kanban,
  Bot,
  HeartHandshake,
  Settings,
  Users,
  Gauge,
  Plug,
  BookOpen,
} from "lucide-react";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { TenantBrand } from "@/components/TenantBrand";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: UserRole.USER },
  { to: "/discovery", label: "Lead Discovery", icon: Search, minRole: UserRole.USER },
  { to: "/leads-found", label: "Leads Found", icon: Inbox, minRole: UserRole.USER },
  { to: "/pipeline", label: "Pipeline", icon: Kanban, minRole: UserRole.USER },
  { to: "/companies", label: "Companies", icon: Building2, minRole: UserRole.USER },
  { to: "/approval", label: "Approval Center", icon: ShieldCheck, minRole: UserRole.USER },
  { to: "/campaigns", label: "Campaign Manager", icon: Megaphone, minRole: UserRole.USER },
  { to: "/similarity", label: "Client Similarity", icon: GitCompareArrows, minRole: UserRole.USER },
  { to: "/copilot", label: "AI Copilot", icon: Bot, minRole: UserRole.USER },
  { to: "/integrations", label: "Integrations", icon: Plug, minRole: UserRole.USER },
  { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, minRole: UserRole.USER },
  { to: "/sales-activity", label: "Sales Activity", icon: HeartHandshake, minRole: UserRole.ADMIN },
  { to: "/settings", label: "Settings", icon: Settings, minRole: UserRole.ADMIN, end: true },
  { to: "/settings/users", label: "Users", icon: Users, minRole: UserRole.ADMIN },
  { to: "/tenants", label: "Tenants", icon: Building2, minRole: UserRole.SUPER_ADMIN },
  { to: "/ai-usage", label: "AI Usage", icon: Gauge, minRole: UserRole.SUPER_ADMIN },
] as const;

export function Sidebar() {
  const { user } = useAuth();
  const items = NAV_ITEMS.filter((item) => !user || ROLE_RANK[user.role] >= ROLE_RANK[item.minRole]);

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-card md:flex">
      <div className="flex min-h-[4.5rem] items-center border-b border-border px-4 py-3">
        <TenantBrand variant="sidebar" />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
          <NavLink
            key={item.to}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1.5">
          <Mail className="h-3.5 w-3.5" />
          Human approval required before send
        </div>
      </div>
    </aside>
  );
}
