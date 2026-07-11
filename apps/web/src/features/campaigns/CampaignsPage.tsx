import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
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
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Batch outreach efforts, each still gated by individual email approval.</p>
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
                <div className="space-y-1.5">
                  <Label htmlFor="campaign-name">Name</Label>
                  <Input id="campaign-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Logistics Push" />
                </div>
                <DialogFooter>
                  <Button
                    disabled={!name || createCampaign.isPending}
                    onClick={() =>
                      createCampaign.mutate(
                        { name },
                        {
                          onSuccess: (res) => {
                            setOpen(false);
                            setName("");
                            toast({ title: "Campaign created", variant: "success" });
                            navigate(`/campaigns/${res.data.id}`);
                          },
                        },
                      )
                    }
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaigns yet.{isAdmin ? " Create one to group and schedule outreach." : ""}</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sorted.map((c) => (
            <Card
              key={c.id}
              className="cursor-pointer transition-colors hover:border-primary/40"
              onClick={() => navigate(`/campaigns/${c.id}`)}
            >
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{c.name}</CardTitle>
                <Badge variant={STATUS_VARIANT[c.status]}>{titleCase(c.status)}</Badge>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{c.leadCount ?? 0} leads</p>
                {c.emailStats && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{c.emailStats.draft} drafts</Badge>
                    <Badge variant="outline">{c.emailStats.pendingApproval} pending</Badge>
                    <Badge variant="outline">{c.emailStats.sent} sent</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
