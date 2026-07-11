import { useEffect, useRef, useState } from "react";
import { ImageIcon, Save, Settings as SettingsIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useOrganization, useUpdateOrganization, useUploadOrgLogo } from "./useOrganization";

const ICP_WEIGHT_FIELDS: Array<{ key: "industry" | "size" | "operations" | "growth" | "similarity"; label: string }> = [
  { key: "industry", label: "Industry Fit" },
  { key: "size", label: "Company Size" },
  { key: "operations", label: "Operations Footprint" },
  { key: "growth", label: "Growth Signals" },
  { key: "similarity", label: "Existing Client Similarity" },
];

export function SettingsPage() {
  const { data: organization, isLoading } = useOrganization();
  const updateOrganization = useUpdateOrganization();
  const uploadLogo = useUploadOrgLogo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [companyProfile, setCompanyProfile] = useState("");
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!organization) return;
    setName(organization.name);
    setCompanyProfile(organization.companyProfile ?? "");
    setWeights({
      industry: organization.settings.icpWeights?.industry ?? 0,
      size: organization.settings.icpWeights?.size ?? 0,
      operations: organization.settings.icpWeights?.operations ?? 0,
      growth: organization.settings.icpWeights?.growth ?? 0,
      similarity: organization.settings.icpWeights?.similarity ?? 0,
    });
  }, [organization]);

  const weightsTotal = Object.values(weights).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);

  const handleLogoChange = (file: File | undefined) => {
    if (!file) return;
    uploadLogo.mutate(file, {
      onSuccess: () => toast({ title: "Logo updated", description: "Refresh to see it across the app.", variant: "success" }),
      onError: (err) => toast({ title: "Failed to upload logo", description: err.message, variant: "error" }),
    });
  };

  const handleSave = () => {
    updateOrganization.mutate(
      { name, companyProfile, icpWeights: weights as never },
      {
        onSuccess: () => toast({ title: "Settings saved", variant: "success" }),
        onError: (err) => toast({ title: "Failed to save settings", description: err.message, variant: "error" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <SettingsIcon className="h-6 w-6 text-primary" />
          Platform Settings
        </h1>
        <p className="text-sm text-muted-foreground">Organization identity and ICP scoring weights used by AI qualification.</p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
              <CardDescription>Displayed across the platform and in outbound email signatures.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="max-w-sm space-y-1.5">
                <Label htmlFor="org-name">Organization name</Label>
                <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="max-w-xl space-y-1.5">
                <Label htmlFor="org-profile">Company profile</Label>
                <Textarea
                  id="org-profile"
                  rows={3}
                  value={companyProfile}
                  onChange={(e) => setCompanyProfile(e.target.value)}
                  placeholder="What does your company sell? This description is used by the AI when qualifying leads and drafting outreach."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  {organization?.logoUrl ? (
                    <img src={organization.logoUrl} alt="Organization logo" className="h-14 w-14 rounded-md border border-border object-contain" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border text-muted-foreground">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    className="hidden"
                    onChange={(e) => handleLogoChange(e.target.files?.[0])}
                  />
                  <Button variant="outline" className="gap-2" disabled={uploadLogo.isPending} onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" />
                    {uploadLogo.isPending ? "Uploading..." : "Upload logo"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG, SVG, or WebP. Max 2MB. Shown in the sidebar and top bar for your team.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ICP Scoring Weights</CardTitle>
              <CardDescription>
                Relative weight (0-100) each factor contributes to a lead's AI qualification score. Currently sums to{" "}
                <span className={weightsTotal === 100 ? "text-emerald-600" : "font-medium text-amber-600"}>{weightsTotal}</span>
                {weightsTotal !== 100 ? " (100 recommended)." : "."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {ICP_WEIGHT_FIELDS.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label htmlFor={`weight-${field.key}`}>{field.label}</Label>
                  <Input
                    id={`weight-${field.key}`}
                    type="number"
                    min={0}
                    max={100}
                    value={weights[field.key] ?? 0}
                    onChange={(e) =>
                      setWeights((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button className="gap-2" disabled={updateOrganization.isPending} onClick={handleSave}>
              <Save className="h-4 w-4" />
              {updateOrganization.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
