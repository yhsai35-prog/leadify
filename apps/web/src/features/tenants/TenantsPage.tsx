import { useRef, useState } from "react";
import { Building2, CalendarClock, ImageIcon, Plus, Trash2, Upload, Users as UsersIcon } from "lucide-react";
import type { DemoRequest, TenantSummary, TenantUserInput } from "@bluwheelz/shared";
import { UserRole } from "@bluwheelz/shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/hooks/useAuth";
import { titleCase } from "@/lib/utils";
import {
  useCreateTenant,
  useDemoRequests,
  useTenants,
  useTenantUsers,
  useUpdateDemoRequestStatus,
  useUpdateTenant,
  useUpdateTenantUserStatus,
  useUploadTenantLogo,
} from "./useTenants";

const DEMO_STATUS_VARIANT: Record<DemoRequest["status"], "default" | "secondary" | "outline"> = {
  new: "default",
  contacted: "secondary",
  closed: "outline",
};

type TenantUserRow = TenantUserInput & { key: string };

function makeEmptyUserRow(role: TenantUserInput["role"] = UserRole.ADMIN): TenantUserRow {
  return { key: crypto.randomUUID(), email: "", fullName: "", role };
}

function CreateTenantDialog() {
  const createTenant = useCreateTenant();
  const uploadLogo = useUploadTenantLogo();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [companyProfile, setCompanyProfile] = useState("");
  const [userRows, setUserRows] = useState<TenantUserRow[]>([makeEmptyUserRow()]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const reset = () => {
    setName("");
    setCompanyProfile("");
    setUserRows([makeEmptyUserRow()]);
    setLogoFile(null);
  };

  function updateRow(key: string, patch: Partial<TenantUserInput>) {
    setUserRows((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setUserRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  const validRows = userRows.filter((r) => r.email.trim() && r.fullName.trim());
  const hasAdmin = validRows.some((r) => r.role === UserRole.ADMIN);
  const canSubmit = !!name.trim() && validRows.length === userRows.length && validRows.length > 0 && hasAdmin;

  const handleCreate = () => {
    const users: TenantUserInput[] = userRows.map(({ email, fullName, role }) => ({
      email: email.trim(),
      fullName: fullName.trim(),
      role,
    }));

    createTenant.mutate(
      { name, companyProfile: companyProfile || undefined, users },
      {
        onSuccess: (result) => {
          if (logoFile) {
            uploadLogo.mutate(
              { id: result.tenant.id, file: logoFile },
              { onError: (err) => toast({ title: "Tenant created, but logo upload failed", description: err.message, variant: "error" }) },
            );
          }
          const invitedCount = result.users.filter((u) => u.status === "invited").length;
          const failed = result.users.filter((u) => u.status === "failed");
          toast({
            title: `${name} created`,
            description:
              failed.length > 0
                ? `${invitedCount} of ${result.users.length} user(s) invited. Failed: ${failed.map((u) => u.email).join(", ")}.`
                : `${invitedCount} user(s) will receive an invite email to set up their account.`,
            variant: failed.length > 0 ? "error" : "success",
          });
          setOpen(false);
          reset();
        },
        onError: (err) => toast({ title: "Failed to create tenant", description: err.message, variant: "error" }),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> New tenant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a tenant</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="tenant-name">Company name</Label>
            <Input id="tenant-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Logistics" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-profile">Company profile (used by AI prompts)</Label>
            <Textarea
              id="tenant-profile"
              rows={2}
              value={companyProfile}
              onChange={(e) => setCompanyProfile(e.target.value)}
              placeholder="Acme provides outsourced fleet management and last-mile delivery..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Users to invite</Label>
            <p className="text-xs text-muted-foreground">Add each teammate's email and role. At least one must be an Admin.</p>
            <div className="space-y-2">
              {userRows.map((row) => (
                <div key={row.key} className="flex items-center gap-2">
                  <Input
                    className="flex-1"
                    placeholder="Full name"
                    value={row.fullName}
                    onChange={(e) => updateRow(row.key, { fullName: e.target.value })}
                  />
                  <Input
                    className="flex-1"
                    type="email"
                    placeholder="email@acme.com"
                    value={row.email}
                    onChange={(e) => updateRow(row.key, { email: e.target.value })}
                  />
                  <Select value={row.role} onValueChange={(next) => updateRow(row.key, { role: next as TenantUserInput["role"] })}>
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      <SelectItem value={UserRole.USER}>User</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={userRows.length === 1}
                    onClick={() => removeRow(row.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setUserRows((rows) => [...rows, makeEmptyUserRow(UserRole.USER)])}
            >
              <Plus className="h-3.5 w-3.5" /> Add user
            </Button>
            {!hasAdmin && <p className="text-xs text-amber-600">At least one user must have the Admin role.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tenant-logo">Logo (optional)</Label>
            <Input
              id="tenant-logo"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={!canSubmit || createTenant.isPending} onClick={handleCreate}>
            {createTenant.isPending ? "Creating..." : "Create tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantUsersDialog({ tenant, onClose }: { tenant: TenantSummary; onClose: () => void }) {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useTenantUsers(tenant.id);
  const updateStatus = useUpdateTenantUserStatus();
  const { toast } = useToast();

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5 text-primary" /> {tenant.name} — users
          </DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : !users || users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users in this tenant yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Access</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{titleCase(u.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isActive}
                      disabled={u.id === currentUser?.id || updateStatus.isPending}
                      aria-label={u.isActive ? `Disable ${u.fullName}` : `Enable ${u.fullName}`}
                      onCheckedChange={(next) =>
                        updateStatus.mutate(
                          { tenantId: tenant.id, userId: u.id, isActive: next },
                          {
                            onSuccess: () =>
                              toast({ title: next ? `${u.fullName} enabled` : `${u.fullName} disabled`, variant: "success" }),
                            onError: (err) =>
                              toast({ title: "Failed to update access", description: err.message, variant: "error" }),
                          },
                        )
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TenantRow({ tenant, onManageUsers }: { tenant: TenantSummary; onManageUsers: () => void }) {
  const updateTenant = useUpdateTenant();
  const uploadLogo = useUploadTenantLogo();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-border"
            title="Upload logo"
            onClick={() => fileInputRef.current?.click()}
          >
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex">
              <Upload className="h-3.5 w-3.5" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              uploadLogo.mutate(
                { id: tenant.id, file },
                {
                  onSuccess: () => toast({ title: `${tenant.name} logo updated`, variant: "success" }),
                  onError: (err) => toast({ title: "Failed to upload logo", description: err.message, variant: "error" }),
                },
              );
            }}
          />
          <div className="min-w-0">
            <p className="truncate font-medium">{tenant.name}</p>
            <p className="truncate text-xs text-muted-foreground">{tenant.companyProfile ?? "No company profile set"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onManageUsers}>
          <UsersIcon className="h-3.5 w-3.5" />
          {tenant.activeUserCount}/{tenant.userCount}
        </Button>
      </TableCell>
      <TableCell className="text-muted-foreground">{new Date(tenant.createdAt).toLocaleDateString()}</TableCell>
      <TableCell>
        <Badge variant={tenant.isActive ? "success" : "outline"}>{tenant.isActive ? "Active" : "Disabled"}</Badge>
      </TableCell>
      <TableCell>
        <Switch
          checked={tenant.isActive}
          disabled={updateTenant.isPending}
          aria-label={tenant.isActive ? `Disable ${tenant.name}` : `Enable ${tenant.name}`}
          onCheckedChange={(next) =>
            updateTenant.mutate(
              { id: tenant.id, isActive: next },
              {
                onSuccess: () =>
                  toast({
                    title: next ? `${tenant.name} enabled` : `${tenant.name} disabled`,
                    description: next ? "Members can sign in again." : "All members of this tenant are now blocked from the platform.",
                    variant: "success",
                  }),
                onError: (err) => toast({ title: "Failed to update tenant", description: err.message, variant: "error" }),
              },
            )
          }
        />
      </TableCell>
    </TableRow>
  );
}

function DemoRequestsTab() {
  const { data: requests, isLoading } = useDemoRequests();
  const updateStatus = useUpdateDemoRequestStatus();
  const { toast } = useToast();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading...</p>;
  if (!requests || requests.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No demo requests yet. They will appear here when visitors submit the Book-a-Demo form on the landing page.
        </CardContent>
      </Card>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Received</TableHead>
          <TableHead className="w-[150px]">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">{r.name}</TableCell>
            <TableCell className="text-muted-foreground">{r.email}</TableCell>
            <TableCell>{r.company ?? "—"}</TableCell>
            <TableCell className="max-w-[280px] truncate text-muted-foreground" title={r.message ?? undefined}>
              {r.message ?? "—"}
            </TableCell>
            <TableCell className="text-muted-foreground">{new Date(r.createdAt).toLocaleString()}</TableCell>
            <TableCell>
              <Select
                value={r.status}
                onValueChange={(next) =>
                  updateStatus.mutate(
                    { id: r.id, status: next as DemoRequest["status"] },
                    { onError: (err) => toast({ title: "Failed to update status", description: err.message, variant: "error" }) },
                  )
                }
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue>
                    <Badge variant={DEMO_STATUS_VARIANT[r.status]}>{titleCase(r.status)}</Badge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["new", "contacted", "closed"] as const).map((s) => (
                    <SelectItem key={s} value={s}>
                      {titleCase(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function TenantsPage() {
  const { data: tenants, isLoading } = useTenants();
  const { data: demoRequests } = useDemoRequests();
  const [usersDialogTenant, setUsersDialogTenant] = useState<TenantSummary | null>(null);

  const newDemoCount = demoRequests?.filter((r) => r.status === "new").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Building2 className="h-6 w-6 text-primary" />
            Tenants
          </h1>
          <p className="text-sm text-muted-foreground">
            Onboard customer organizations, manage their branding and users, and review demo requests.
          </p>
        </div>
        <CreateTenantDialog />
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants" className="gap-2">
            <Building2 className="h-4 w-4" /> Tenants
          </TabsTrigger>
          <TabsTrigger value="demo-requests" className="gap-2">
            <CalendarClock className="h-4 w-4" /> Demo requests
            {newDemoCount > 0 && <Badge className="ml-1">{newDemoCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="mt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !tenants || tenants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tenants yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead className="w-[110px]">Users</TableHead>
                  <TableHead className="w-[130px]">Created</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[90px]">Enabled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tenants.map((tenant) => (
                  <TenantRow key={tenant.id} tenant={tenant} onManageUsers={() => setUsersDialogTenant(tenant)} />
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="demo-requests" className="mt-4">
          <DemoRequestsTab />
        </TabsContent>
      </Tabs>

      {usersDialogTenant && <TenantUsersDialog tenant={usersDialogTenant} onClose={() => setUsersDialogTenant(null)} />}
    </div>
  );
}
