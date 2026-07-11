import { Plug, Mail, CheckCircle2, Circle, Server, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings, useUpdateUserSettings } from "./useUserSettings";

interface IntegrationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected: boolean;
  badge?: string;
  onSelect: () => void;
  disabled?: boolean;
  footer?: React.ReactNode;
}

function IntegrationCard({
  icon,
  title,
  description,
  isSelected,
  badge,
  onSelect,
  disabled,
  footer,
}: IntegrationCardProps) {
  return (
    <Card className={`relative transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
      {isSelected && (
        <div className="absolute right-3 top-3">
          <CheckCircle2 className="h-5 w-5 text-primary" />
        </div>
      )}
      <CardHeader className="flex-row items-start gap-4 pb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-2xl">
          {icon}
        </div>
        <div className="flex-1 space-y-0.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">{title}</CardTitle>
            {badge && (
              <Badge variant="secondary" className="text-[10px]">
                {badge}
              </Badge>
            )}
          </div>
          <CardDescription className="text-sm">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {footer}
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="w-full gap-2"
          onClick={onSelect}
          disabled={disabled}
        >
          {isSelected ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Selected
            </>
          ) : (
            <>
              <Circle className="h-4 w-4" />
              Select
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function IntegrationsPage() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
  const update = useUpdateUserSettings();
  const { toast } = useToast();

  const current = settings?.preferredEmailClient ?? "none";

  function select(client: "gmail" | "smtp" | "none") {
    const next = current === client ? "none" : client;
    update.mutate(
      { preferredEmailClient: next },
      {
        onSuccess: () =>
          toast({
            title: next === "none" ? "Integration removed" : `${next === "gmail" ? "Gmail" : "SMTP"} selected`,
            variant: "success",
          }),
        onError: (err) => toast({ title: "Failed to update", description: err.message, variant: "error" }),
      },
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Plug className="h-6 w-6 text-primary" />
          Integrations
        </h1>
        <p className="text-sm text-muted-foreground">
          Choose how outreach emails are sent from your account. This setting is personal — each team member configures their own integration.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">Email Clients</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Set a default so email actions open a compose window in your own inbox — recipient pre-filled, ready to send.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <IntegrationCard
                icon={
                  <svg viewBox="0 0 48 48" className="h-6 w-6" aria-hidden="true">
                    <path fill="#EA4335" d="M24 5C13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19S34.5 5 24 5z" opacity="0" />
                    <path fill="#4285F4" d="M45.5 24c0-1.2-.1-2.4-.3-3.5H24v6.6h12.1c-.5 2.8-2.1 5.2-4.5 6.8v5.6h7.3C42.8 35.6 45.5 30.2 45.5 24z" />
                    <path fill="#34A853" d="M24 46c6.1 0 11.2-2 14.9-5.5l-7.3-5.6c-2 1.4-4.6 2.2-7.6 2.2-5.8 0-10.8-3.9-12.5-9.2H3.9v5.8C7.6 41.8 15.3 46 24 46z" />
                    <path fill="#FBBC05" d="M11.5 27.9c-.5-1.4-.7-2.8-.7-4.3s.3-3 .7-4.3v-5.8H3.9C2.4 16.3 1.5 20 1.5 24s.9 7.7 2.4 10.5l7.6-6.6z" />
                    <path fill="#EA4335" d="M24 10.2c3.3 0 6.2 1.1 8.5 3.3l6.4-6.4C34.9 3.3 29.8 1 24 1 15.3 1 7.6 6.2 3.9 13.5l7.6 5.8c1.7-5.3 6.7-9.1 12.5-9.1z" />
                  </svg>
                }
                title="Gmail"
                description="Compose and send emails from your Gmail inbox. Opens a popup with the recipient pre-filled."
                isSelected={current === "gmail"}
                onSelect={() => select("gmail")}
                disabled={update.isPending}
                footer={
                  current === "gmail" && user?.email ? (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Sender email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <p className="text-sm font-medium">{user.email}</p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        Auto-filled from your platform account. Log into Gmail with this address.
                      </p>
                    </div>
                  ) : null
                }
              />

              <IntegrationCard
                icon={<Server className="h-6 w-6 text-muted-foreground" />}
                title="SMTP"
                description="Send via your own SMTP server. Configure your SMTP credentials in Profile Settings."
                isSelected={current === "smtp"}
                onSelect={() => select("smtp")}
                disabled={update.isPending}
                footer={
                  current === "smtp" ? (
                    <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                      <Link
                        to="/profile/settings"
                        className="flex items-center gap-1.5 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Configure SMTP in Profile Settings
                      </Link>
                    </div>
                  ) : null
                }
              />
            </div>
          </div>

          {current !== "none" && (
            <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">How it works:</strong>{" "}
              {current === "gmail"
                ? "After an email is approved, open Approval Center → Ready to send. Click Send with Gmail to open a prefilled compose window, then Mark as sent so the lead timeline records the send."
                : "When SMTP is configured, approved outreach emails will be sent directly from your SMTP server without leaving the platform."}
            </div>
          )}
        </>
      )}
    </div>
  );
}
