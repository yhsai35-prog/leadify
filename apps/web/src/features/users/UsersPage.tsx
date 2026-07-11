import { useState } from "react";
import { Plus, Trash2, Users as UsersIcon } from "lucide-react";
import { UserRole } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { titleCase } from "@/lib/utils";
import { useInviteUser, useRemoveUser, useUpdateUserRole, useUpdateUserStatus, useUsers } from "./useUsers";

const ROLE_OPTIONS = [UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  super_admin: "default",
  admin: "secondary",
  user: "outline",
};

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useUsers();
  const inviteUser = useInviteUser();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const removeUser = useRemoveUser();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; fullName: string } | null>(null);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<string>(UserRole.USER);

  const handleInvite = () => {
    inviteUser.mutate(
      { email, fullName, role: role as UserRole },
      {
        onSuccess: () => {
          setOpen(false);
          setEmail("");
          setFullName("");
          setRole(UserRole.USER);
          toast({ title: "User invited", description: `${email} will receive a Supabase invite email.`, variant: "success" });
        },
        onError: (err) => toast({ title: "Failed to invite user", description: err.message, variant: "error" }),
      },
    );
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    removeUser.mutate(removeTarget.id, {
      onSuccess: () => {
        toast({
          title: `${removeTarget.fullName} removed`,
          description: "Their account has been deactivated and they can no longer sign in.",
          variant: "success",
        });
        setRemoveTarget(null);
      },
      onError: (err) => toast({ title: "Failed to remove user", description: err.message, variant: "error" }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <UsersIcon className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground">Invite teammates, manage roles, and remove access.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Invite user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite a user</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="invite-name">Full name</Label>
                <Input id="invite-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {titleCase(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button disabled={!email || !fullName || inviteUser.isPending} onClick={handleInvite}>
                {inviteUser.isPending ? "Inviting..." : "Send invite"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : !users || users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Change role</TableHead>
              <TableHead className="w-[100px]">Access</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? "outline"}>{titleCase(u.role)}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={u.isActive ? "success" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(next) =>
                      updateRole.mutate(
                        { id: u.id, role: next as UserRole },
                        {
                          onSuccess: () => toast({ title: `${u.fullName}'s role updated`, variant: "success" }),
                          onError: (err) => toast({ title: "Failed to update role", description: err.message, variant: "error" }),
                        },
                      )
                    }
                    disabled={u.id === currentUser?.id || !u.isActive}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {titleCase(r)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={u.isActive}
                    disabled={u.id === currentUser?.id || updateStatus.isPending}
                    aria-label={u.isActive ? `Disable ${u.fullName}` : `Enable ${u.fullName}`}
                    onCheckedChange={(next) =>
                      updateStatus.mutate(
                        { id: u.id, isActive: next },
                        {
                          onSuccess: () =>
                            toast({
                              title: next ? `${u.fullName} enabled` : `${u.fullName} disabled`,
                              description: next
                                ? "They can sign in again."
                                : "They are blocked from signing in until re-enabled.",
                              variant: "success",
                            }),
                          onError: (err) =>
                            toast({ title: "Failed to update access", description: err.message, variant: "error" }),
                        },
                      )
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={u.id === currentUser?.id || !u.isActive || removeUser.isPending}
                    onClick={() => setRemoveTarget({ id: u.id, fullName: u.fullName })}
                    aria-label={`Remove ${u.fullName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={!!removeTarget} onOpenChange={(next) => !next && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removeTarget?.fullName}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This deactivates their account and blocks sign-in. Their historical leads, approvals, and activity records
            are kept for audit purposes.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removeUser.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removeUser.isPending}>
              {removeUser.isPending ? "Removing..." : "Remove user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
