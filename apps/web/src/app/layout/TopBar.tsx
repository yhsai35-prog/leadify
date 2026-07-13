import { Moon, Sun, LogOut, User, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserRole } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadifyMark, TenantBrand } from "@/components/TenantBrand";
import { NotificationsDropdown } from "@/features/notifications/NotificationsDropdown";
import { useTheme } from "@/stores/theme";
import { useAuth } from "@/hooks/useAuth";
import { titleCase } from "@/lib/utils";

export function TopBar() {
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  // Super admins are platform operators — never surface a tenant org name.
  const isPlatformOperator = user?.role === UserRole.SUPER_ADMIN;
  const brandName = isPlatformOperator ? "Leadify" : user?.organizationName || "Leadify";
  const tenantLogoUrl = isPlatformOperator ? null : (user?.organizationLogoUrl ?? null);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div className="flex items-center gap-3">
        <TenantBrand variant="compact" className="md:hidden" />
        <div className="hidden items-center gap-3 md:flex">
          {tenantLogoUrl ? (
            <>
              <img src={tenantLogoUrl} alt="" className="h-8 w-8 rounded-md object-contain" />
              <span className="font-semibold tracking-tight">{brandName}</span>
            </>
          ) : (
            <LeadifyMark className="h-9 w-9" />
          )}
          <span className="text-sm text-muted-foreground">AI Sales Intelligence Platform</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <NotificationsDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              {user?.fullName ?? "Account"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
            <DropdownMenuLabel className="pt-0 text-[11px] uppercase text-muted-foreground">
              {user ? titleCase(user.role) : ""}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/profile/settings")} className="gap-2">
              <Settings className="h-4 w-4" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
