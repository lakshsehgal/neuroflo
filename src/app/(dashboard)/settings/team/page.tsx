"use client";

import { useState, useEffect, useTransition } from "react";
import { getTeamMembers, getPendingInvites, inviteUser, updateUserRole, deactivateUser, cancelInvite, getDepartments } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Mail, Clock, Copy, Check, UserX, X } from "lucide-react";

type User = { id: string; name: string; email: string; role: string; isActive: boolean; department: { name: string } | null };
type Invite = { id: string; email: string; role: string; token: string; expiresAt: Date };
type Dept = { id: string; name: string };

export default function TeamPage() {
  const [members, setMembers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [departments, setDepartments] = useState<Dept[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [deptId, setDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [m, i, d] = await Promise.all([getTeamMembers(), getPendingInvites(), getDepartments()]);
    setMembers(m as User[]);
    setInvites(i as Invite[]);
    setDepartments(d.map((dd) => ({ id: dd.id, name: dd.name })));
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await inviteUser({ email, role: role as "ADMIN" | "MANAGER" | "OPERATOR" | "MEMBER" | "VIEWER", departmentId: deptId || undefined });
    if (result.success) {
      setEmail(""); setRole("MEMBER"); setDeptId(""); setDialogOpen(false); loadData();
    } else {
      setError(result.error || "Failed to send invite");
    }
    setLoading(false);
  }

  function handleRoleChange(userId: string, newRole: string) {
    startTransition(async () => {
      await updateUserRole(userId, newRole as "ADMIN" | "MANAGER" | "OPERATOR" | "MEMBER" | "VIEWER");
      loadData();
    });
  }

  function handleDeactivate(userId: string) {
    if (!confirm("Deactivate this user? They will lose access and be removed from the list.")) return;
    startTransition(async () => { await deactivateUser(userId); loadData(); });
  }

  function handleCancelInvite(inviteId: string) {
    if (!confirm("Cancel this invite? The link will no longer work.")) return;
    startTransition(async () => { await cancelInvite(inviteId); loadData(); });
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/accept-invite?token=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const roleColors: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800", MANAGER: "bg-blue-100 text-blue-800",
    OPERATOR: "bg-purple-100 text-purple-800", MEMBER: "bg-green-100 text-green-800", VIEWER: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage team members, roles, and invitations</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Invite Member</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              {error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@agency.com" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="OPERATOR">Operator</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={deptId} onValueChange={setDeptId}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">An invite link will be generated. Share it with the user to create their account. Expires in 7 days.</p>
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Sending..." : "Generate Invite Link"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Members ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((user) => (
              <div key={user.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{user.name.split(" ").map((n) => n[0]).join("")}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.department && <Badge variant="outline" className="text-xs">{user.department.name}</Badge>}
                  <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v)}>
                    <SelectTrigger className="h-7 w-28">
                      <Badge className={`${roleColors[user.role] || ""} text-[10px]`} variant="secondary">{user.role}</Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="OPERATOR">Operator</SelectItem>
                      <SelectItem value="MANAGER">Manager</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleDeactivate(user.id)} title="Deactivate">
                    <UserX className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {invites.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Pending Invites ({invites.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={roleColors[invite.role] || ""} variant="secondary">{invite.role}</Badge>
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => copyInviteLink(invite.token)}>
                      {copiedToken === invite.token ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy Link</>}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => handleCancelInvite(invite.id)} title="Cancel invite">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
