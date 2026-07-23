import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { CampaignChannel, ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { titleCase } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { useCampaigns, useCreateCampaign } from "./useCampaigns";

const STATUS_VARIANT = {
  draft: "outline",
  active: "success",
  paused: "warning",
  completed: "secondary",
} as const;

type SortKey = "name" | "sent" | "leads";

export function CampaignsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = Boolean(user && ROLE_RANK[user.role] >= ROLE_RANK[UserRole.ADMIN]);
  const { data: campaigns, isLoading } = useCampaigns();
  const createCampaign = useCreateCampaign();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<CampaignChannel>(CampaignChannel.EMAIL);
  const [open, setOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const sorted = useMemo(() => {
    if (!campaigns) return [];
    return [...campaigns].sort((a, b) => {
      if (sortBy === "sent") return (b.emailStats?.sent ?? 0) - (a.emailStats?.sent ?? 0);
      if (sortBy === "leads") return (b.leadCount ?? 0) - (a.leadCount ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [campaigns, sortBy]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaign Manager</h1>
          <p className="text-sm text-muted-foreground">
            Design Email or WhatsApp flows visually. Every send still requires human approval.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="leads">Leads</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" /> New Campaign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Campaign</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="campaign-name">Name</Label>
                    <Input
                      id="campaign-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Q1 Logistics Push"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Channel</Label>
                    <Select value={channel} onValueChange={(v) => setChannel(v as CampaignChannel)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    disabled={!name || createCampaign.isPending}
                    onClick={() =>
                      createCampaign.mutate(
                        { name, channel, useRecommendedFlow: true },
                        {
                          onSuccess: (res) => {
                            setOpen(false);
                            setName("");
                            setChannel(CampaignChannel.EMAIL);
                            toast({ title: "Campaign created", variant: "success" });
                            navigate(`/campaigns/${res.data.id}`);
                          },
                        },
                      )
                    }
                  >
                    Create with recommended flow
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns...</p>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No campaigns yet. Create one to design your first outreach flow.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sorted.map((campaign) => (
            <Card
              key={campaign.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/campaigns/${campaign.id}`)}
            >
              <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{campaign.name}</CardTitle>
                <div className="flex gap-1">
                  <Badge variant="secondary">{campaign.channel === "whatsapp" ? "WhatsApp" : "Email"}</Badge>
                  <Badge variant={STATUS_VARIANT[campaign.status]}>{titleCase(campaign.status)}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <p>{campaign.leadCount ?? 0} leads</p>
                <p>
                  {campaign.emailStats?.sent ?? 0} sent · {campaign.emailStats?.pendingApproval ?? 0} pending
                  approval
                </p>
                {(campaign.flowDefinition?.nodes?.length ?? 0) > 0 && (
                  <p className="text-xs text-foreground/70">Flow configured</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
