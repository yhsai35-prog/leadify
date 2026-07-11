import { useEffect, useState } from "react";
import { Eye, EyeOff, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserSettings, useUpdateUserSettings } from "@/features/integrations/useUserSettings";

export function ProfileSettingsPage() {
  const { user } = useAuth();
  const { data: settings, isLoading } = useUserSettings();
  const update = useUpdateUserSettings();
  const { toast } = useToast();

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState<string>("587");
  const [smtpEmail, setSmtpEmail] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const s = settings.smtpSettings;
    setSmtpHost(s.host ?? "");
    setSmtpPort(s.port?.toString() ?? "587");
    setSmtpEmail(s.email ?? user?.email ?? "");
    setSmtpPassword(s.password ?? "");
    if (s.host || s.port) setShowAdvanced(true);
  }, [settings, user?.email]);

  const handleSave = () => {
    update.mutate(
      {
        smtpSettings: {
          host: smtpHost || undefined,
          port: smtpPort ? Number(smtpPort) : undefined,
          email: smtpEmail || undefined,
          password: smtpPassword || undefined,
        },
      },
      {
        onSuccess: () => toast({ title: "SMTP settings saved", variant: "success" }),
        onError: (err) => toast({ title: "Failed to save", description: err.message, variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <User className="h-6 w-6 text-primary" />
          Profile Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal account preferences. These settings apply only to your account.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account</CardTitle>
              <CardDescription>Your platform identity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input value={user?.fullName ?? ""} disabled className="bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <Input value={user?.email ?? ""} disabled className="bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Input value={user?.role ?? ""} disabled className="bg-muted/40 capitalize" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMTP Email Settings</CardTitle>
              <CardDescription>
                Used when your integration is set to <strong>SMTP</strong>. Your email will be the sender for all outbound outreach. Go to{" "}
                <a href="/integrations" className="text-primary underline-offset-4 hover:underline">
                  Integrations
                </a>{" "}
                to select SMTP as your email client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="smtp-email">SMTP Email</Label>
                  <Input
                    id="smtp-email"
                    type="email"
                    placeholder={user?.email ?? "you@example.com"}
                    value={smtpEmail}
                    onChange={(e) => setSmtpEmail(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">The address emails will be sent from.</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="smtp-password">SMTP Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="App password or SMTP password"
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">For Gmail use an App Password, not your account password.</p>
                </div>
              </div>

              <button
                type="button"
                className="text-sm text-primary underline-offset-4 hover:underline"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Hide advanced settings" : "Show advanced settings (SMTP host & port)"}
              </button>

              {showAdvanced && (
                <div className="grid gap-4 rounded-md border border-border p-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button className="gap-2" disabled={update.isPending} onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  {update.isPending ? "Saving..." : "Save SMTP settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
