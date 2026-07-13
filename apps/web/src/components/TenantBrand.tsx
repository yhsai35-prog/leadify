import { UserRole } from "@bluwheelz/shared";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const LEADIFY_LOGO_SRC = "/leadify-logo.png";

interface TenantBrandProps {
  className?: string;
  /** Sidebar/header: logo mark + tenant name. Login/full: large stacked platform brand. */
  variant?: "sidebar" | "compact" | "full";
}

/** Official Leadify wordmark — use anywhere the platform brand should appear. */
export function LeadifyMark({ className, alt = "Leadify" }: { className?: string; alt?: string }) {
  return (
    <img
      src={LEADIFY_LOGO_SRC}
      alt={alt}
      className={cn("shrink-0 rounded-md object-contain", className)}
    />
  );
}

function TenantLogo({ logoUrl, className }: { logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" aria-hidden className={cn("shrink-0 rounded-md object-contain", className)} />;
  }
  return <LeadifyMark className={className} alt="" />;
}

/**
 * Tenant-aware branding: shows the signed-in organization's logo and name
 * where available. Platform super admins always see the Leadify brand —
 * they operate across tenants, so a single tenant name (e.g. Bluwheelz)
 * must not appear as their identity.
 */
export function TenantBrand({ className, variant = "sidebar" }: TenantBrandProps) {
  const { user } = useAuth();
  const isPlatformOperator = user?.role === UserRole.SUPER_ADMIN;
  const orgName = isPlatformOperator ? "Leadify" : user?.organizationName || "Leadify";
  const logoUrl = isPlatformOperator ? null : (user?.organizationLogoUrl ?? null);
  const subtitle = isPlatformOperator ? "Platform" : "Powered by Leadify";
  const showingLeadifyWordmark = !logoUrl;

  if (variant === "full") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <TenantLogo logoUrl={logoUrl} className="h-20 w-20" />
        {!showingLeadifyWordmark && <span className="text-2xl font-bold tracking-tight">{orgName}</span>}
      </div>
    );
  }

  if (variant === "compact") {
    if (showingLeadifyWordmark) {
      return (
        <div className={cn("flex items-center", className)}>
          <LeadifyMark className="h-9 w-9" />
        </div>
      );
    }
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TenantLogo logoUrl={logoUrl} className="h-9 w-9" />
        <span className="truncate text-base font-semibold tracking-tight">{orgName}</span>
      </div>
    );
  }

  if (showingLeadifyWordmark) {
    return (
      <div className={cn("flex items-center", className)}>
        <LeadifyMark className="h-12 w-12" />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <TenantLogo logoUrl={logoUrl} className="h-11 w-11" />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-base font-semibold tracking-tight">{orgName}</p>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
