import { useNavigate } from "react-router-dom";
import type { Notification } from "@bluwheelz/shared";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatDateTime, titleCase } from "@/lib/utils";
import { useMarkNotificationRead, useNotifications } from "./useNotifications";

function formatNotification(notification: Notification): { title: string; description: string; href?: string } {
  switch (notification.type) {
    case "approval_needed":
      return {
        title: "Approval needed",
        description: "New outreach is waiting for your review in the Approval Center.",
        href: "/approval",
      };
    case "follow_up_due": {
      const payload = notification.payload as { leadId?: string; companyName?: string; contactName?: string };
      const who = payload.contactName
        ? `${payload.contactName}${payload.companyName ? ` at ${payload.companyName}` : ""}`
        : payload.companyName ?? "your prospect";
      return {
        title: "Follow-up due",
        description: `It has been 3 days since you emailed ${who}. Time to follow up.`,
        href: payload.leadId ? `/pipeline/${payload.leadId}` : "/pipeline",
      };
    }
    case "demo_request": {
      const payload = notification.payload as { name?: string; company?: string };
      return {
        title: "New demo request",
        description: `${payload.name ?? "Someone"}${payload.company ? ` from ${payload.company}` : ""} booked a demo from the landing page.`,
        href: "/tenants",
      };
    }
    default:
      return {
        title: titleCase(notification.type.replace(/_/g, " ")),
        description: "Open the platform to review this update.",
      };
  }
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unreadCount = notifications?.filter((n) => !n.readAt).length ?? 0;

  const handleOpen = (notification: Notification) => {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }
    const { href } = formatNotification(notification);
    if (href) navigate(href);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-4 py-3 text-sm font-semibold">
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">({unreadCount} unread)</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading notifications...</p>
          ) : !notifications?.length ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            notifications.map((notification) => {
              const { title, description } = formatNotification(notification);
              const isUnread = !notification.readAt;
              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleOpen(notification)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-accent",
                    isUnread && "bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium">{title}</span>
                    {isUnread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{description}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                </button>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
