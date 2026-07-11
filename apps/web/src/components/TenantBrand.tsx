import { UserRole } from "@bluwheelz/shared";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TenantBrandProps {
  className?: string;
  /** Sidebar/header: logo mark + tenant name. Login/full: large stacked platform brand. */
  variant?: "sidebar" | "compact" | "full";
}

/** Platform logo mark used when a tenant has not uploaded their own logo. */
export function LeadifyMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={cn("shrink-0", className)}>
      <rect width="48" height="48" rx="12" fill="url(#leadify-grad)" />
      <path
        d="M15 33V15h4.4v14.2H29V33H15Z"
        fill="white"
      />
      <path d="M30 15l4 6.5L38 15h-8Z" fill="white" opacity="0.85" />
      <defs>
        <linearGradient id="leadify-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="0.5" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function TenantLogo({ logoUrl, className }: { logoUrl: string | null; className?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" aria-hidden className={cn("shrink-0 rounded-md object-contain", className)} />;
  }
  return <LeadifyMark className={className} />;
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

  if (variant === "full") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <TenantLogo logoUrl={logoUrl} className="h-16 w-16" />
        <span className="text-2xl font-bold tracking-tight">{orgName}</span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TenantLogo logoUrl={logoUrl} className="h-9 w-9" />
        <span className="truncate text-base font-semibold tracking-tight">{orgName}</span>
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
