"use client";

import { useState, useEffect } from "react";
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
  updateProject,
  updateProjectStatus,
  getAvailableUsersForProject,
} from "@/actions/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Users,
  UserPlus,
  Settings,
  Trash2,
  Loader2,
  Check,
  Shield,
  Crown,
} from "lucide-react";

interface Member {
  userId: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
  };
}

interface ProjectSettingsProps {
  projectId: string;
  projectName: string;
  projectDescription: string | null;
  projectStatus: string;
  projectClientId: string | null;
  projectDepartmentId: string | null;
  projectStartDate: string | null;
  projectEndDate: string | null;
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export function ProjectSettings({
  projectId,
  projectName,
  projectDescription,
  projectStatus,
  projectClientId,
  projectDepartmentId,
  projectStartDate,
  projectEndDate,
  members: initialMembers,
  currentUserId,
  currentUserRole,
}: ProjectSettingsProps) {
  const [members, setMembers] = useState(initialMembers);
  const [name, setName] = useState(projectName);
  const [description, setDescription] = useState(projectDescription || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);
  const [removingUser, setRemovingUser] = useState<string | null>(null);
  const [status, setStatus] = useState(projectStatus);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const isLead = members.some(
    (m) => m.userId === currentUserId && m.role === "LEAD"
  );
  const canManageMembers =
    isLead || currentUserRole === "ADMIN" || currentUserRole === "MANAGER";

  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  async function handleSaveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setMessage("");
    const result = await updateProject(projectId, {
      name: name.trim(),
      description: description.trim() || undefined,
    });
    if (result.success) {
      setMessage("Project updated");
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  }

  async function handleOpenAddDialog() {
    setAddDialogOpen(true);
    setLoadingUsers(true);
    try {
      const users = await getAvailableUsersForProject(projectId);
      setAvailableUsers(users);
    } catch {
      setAvailableUsers([]);
    }
    setLoadingUsers(false);
  }

  async function handleAddMember(userId: string) {
    setAddingUser(userId);
    const result = await addProjectMember(projectId, userId);
    if (result.success) {
      setAvailableUsers((prev) => prev.filter((u) => u.id !== userId));
      setAddDialogOpen(false);
    }
    setAddingUser(null);
  }

  async function handleRemoveMember(userId: string) {
    if (!confirm("Remove this member from the project?")) return;
    setRemovingUser(userId);
    await removeProjectMember(projectId, userId);
    setRemovingUser(null);
  }

  async function handleRoleChange(userId: string, newRole: string) {
    await updateProjectMemberRole(projectId, userId, newRole);
  }

  async function handleStatusChange(newStatus: "ACTIVE" | "CLOSED") {
    setUpdatingStatus(true);
    const result = await updateProjectStatus(projectId, newStatus);
    if (result.success) {
      setStatus(newStatus);
    }
    setUpdatingStatus(false);
  }

  const initials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="space-y-6">
      {/* Project Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Project Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                This project is currently{" "}
                <Badge
                  variant="secondary"
                  className={status === "ACTIVE"
                    ? "bg-green-100 text-green-800"
                    : "bg-slate-100 text-slate-800"
                  }
                >
                  {status === "ACTIVE" ? "Active" : "Closed"}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "ACTIVE"
                  ? "Team members can create tasks and make changes."
                  : "This project is closed. Reopen it to resume work."}
              </p>
            </div>
            <Button
              variant={status === "ACTIVE" ? "outline" : "default"}
              size="sm"
              onClick={() => handleStatusChange(status === "ACTIVE" ? "CLOSED" : "ACTIVE")}
              disabled={updatingStatus}
            >
              {updatingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : null}
              {status === "ACTIVE" ? "Close Project" : "Reopen Project"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Project Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveDetails} className="space-y-4">
            {message && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-400">
                <Check className="h-4 w-4" />
                {message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectDesc">Description</Label>
              <Textarea
                id="projectDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Project description..."
              />
            </div>
            <Button
              type="submit"
              disabled={
                saving ||
                (name.trim() === projectName &&
                  description.trim() === (projectDescription || ""))
              }
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({members.length})
            </CardTitle>
            {canManageMembers && (
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={handleOpenAddDialog}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to Project</DialogTitle>
                  </DialogHeader>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : availableUsers.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        All team members are already in this project
                      </p>
                    ) : (
                      availableUsers.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              {u.avatar && <AvatarImage src={u.avatar} />}
                              <AvatarFallback className="text-xs">
                                {initials(u.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {u.email}
                              </p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAddMember(u.id)}
                            disabled={addingUser === u.id}
                          >
                            {addingUser === u.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center justify-between rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs">
                      {initials(m.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.user.name}</p>
                      {m.role === "LEAD" && (
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    <Shield className="mr-1 h-3 w-3" />
                    {m.user.role}
                  </Badge>
                  {canManageMembers ? (
                    <>
                      <Select
                        value={m.role}
                        onValueChange={(val) =>
                          handleRoleChange(m.userId, val)
                        }
                      >
                        <SelectTrigger className="h-8 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEAD">Lead</SelectItem>
                          <SelectItem value="MEMBER">Member</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveMember(m.userId)}
                        disabled={removingUser === m.userId}
                      >
                        {removingUser === m.userId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <Badge variant={m.role === "LEAD" ? "default" : "outline"}>
                      {m.role}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Access Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Access & Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
              <Crown className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Project Lead</p>
                <p className="text-xs text-muted-foreground">
                  Can manage members, edit project settings, and assign tasks
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3">
              <Users className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <p className="font-medium">Project Member</p>
                <p className="text-xs text-muted-foreground">
                  Can view project, create and manage tasks, and comment
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Organization-level roles (Admin, Manager) can also manage project
              settings regardless of project role.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
