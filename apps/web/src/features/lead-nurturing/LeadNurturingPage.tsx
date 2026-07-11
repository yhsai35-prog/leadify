import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, HeartHandshake, Linkedin, Mail, XCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserSelector } from "@/components/UserSelector";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/utils";
import { useAssignLead } from "@/features/pipeline/usePipeline";
import { PipelineStatusBadge } from "@/features/pipeline/PipelineStatusBadge";
import { useUsers } from "@/features/users/useUsers";
import { useLeadNurturing } from "./useLeadNurturing";

const UNASSIGNED_VALUE = "__unassigned__";

function OwnerSelect({ leadId, ownerId }: { leadId: string; ownerId: string | null }) {
  const { data: users, isLoading } = useUsers();
  const assign = useAssignLead();
  const { toast } = useToast();

  return (
    <Select
      value={ownerId ?? UNASSIGNED_VALUE}
      disabled={isLoading || assign.isPending}
      onValueChange={(userId) => {
        if (userId === UNASSIGNED_VALUE) return;
        assign.mutate(
          { leadId, assignedTo: userId },
          {
            onSuccess: () => toast({ title: "Owner assigned", variant: "success" }),
            onError: (err) => toast({ title: "Could not assign owner", description: err.message, variant: "error" }),
          },
        );
      }}
    >
      <SelectTrigger className="h-8 w-[160px]" onClick={(e) => e.stopPropagation()}>
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED_VALUE} disabled>
          Unassigned
        </SelectItem>
        {users?.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AckIcon({ acknowledged }: { acknowledged: boolean }) {
  return acknowledged ? (
    <CheckCircle2 className="h-4 w-4 text-success" />
  ) : (
    <XCircle className="h-4 w-4 text-destructive" />
  );
}

export function LeadNurturingPage() {
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const { data: leads, isLoading } = useLeadNurturing(userId);
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <HeartHandshake className="h-6 w-6 text-primary" />
            Sales Activity
          </h1>
          <p className="text-sm text-muted-foreground">
            Track outreach follow-through per lead: contacts reached, emails sent, and self-reported acknowledgements.
            Assign an owner per row to delegate follow-up responsibility.
          </p>
        </div>
        <UserSelector value={userId} onChange={setUserId} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !leads || leads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No leads found for this filter.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Emails Sent</TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email Ack
                </span>
              </TableHead>
              <TableHead>
                <span className="inline-flex items-center gap-1">
                  <Linkedin className="h-3.5 w-3.5" /> LinkedIn Ack
                </span>
              </TableHead>
              <TableHead>Last Activity</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.leadId} className="cursor-pointer" onClick={() => navigate(`/pipeline/${lead.leadId}`)}>
                <TableCell className="font-medium">{lead.companyName}</TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <OwnerSelect leadId={lead.leadId} ownerId={lead.ownerId} />
                </TableCell>
                <TableCell>{lead.contactsCount}</TableCell>
                <TableCell>{lead.emailsSentCount}</TableCell>
                <TableCell>
                  <AckIcon acknowledged={lead.emailAcknowledged} />
                </TableCell>
                <TableCell>
                  <AckIcon acknowledged={lead.linkedinAcknowledged} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.lastActivityAt ? formatDate(lead.lastActivityAt) : "—"}
                </TableCell>
                <TableCell>
                  <PipelineStatusBadge status={lead.pipelineStatus} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
