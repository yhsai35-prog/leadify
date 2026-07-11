import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Send, X } from "lucide-react";
import { ROLE_RANK, UserRole } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePendingApprovals, useReadyToSendApprovals } from "./useApproval";
import { ApprovalCard } from "./ApprovalCard";
import { ReadyToSendCard } from "./ReadyToSendCard";

export function ApprovalQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const { data: items, isLoading } = usePendingApprovals(campaignId);
  const { data: readyItems, isLoading: readyLoading } = useReadyToSendApprovals(campaignId);
  const { user } = useAuth();
  const isAdmin = Boolean(user && ROLE_RANK[user.role] >= ROLE_RANK[UserRole.ADMIN]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Approval Center</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Review drafts here, then send approved outreach with Gmail. Nothing leaves the platform until it's approved."
            : "Review and approve the outreach you've generated here, then send it with Gmail."}
        </p>
        {campaignId && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Filtered by campaign</span>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setSearchParams({})}>
              <X className="h-3.5 w-3.5" /> Clear filter
            </Button>
            <Button asChild variant="link" size="sm" className="px-0">
              <Link to={`/campaigns/${campaignId}`}>Back to campaign</Link>
            </Button>
          </div>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pending approval</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading approval queue...</p>
        ) : !items || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {campaignId
                ? "No outreach from this campaign is waiting for approval."
                : isAdmin
                  ? "No outreach is waiting for approval right now."
                  : "You have no outreach waiting for approval right now."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ApprovalCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ready to send</h2>
        {readyLoading ? (
          <p className="text-sm text-muted-foreground">Loading ready-to-send emails...</p>
        ) : !readyItems || readyItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-12 text-center">
            <Send className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No approved emails waiting to be sent with Gmail.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {readyItems.map((item) => (
              <ReadyToSendCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
