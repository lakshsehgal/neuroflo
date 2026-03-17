"use client";

import { useState, useEffect, useTransition } from "react";
import {
  getDepartments,
  createDepartment,
  deleteDepartment,
} from "@/actions/admin";
import {
  getTeamsWithDepartments,
  createTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from "@/actions/team-tasks";
import { getTeamUsers } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Plus,
  Trash2,
  Users,
  Building2,
  UserPlus,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type Department = {
  id: string;
  name: string;
  _count: { users: number };
};

type TeamData = {
  id: string;
  name: string;
  department: { id: string; name: string };
  _count: { members: number; teamTasks: number };
  members?: { id: string; userId: string; role: string; user: { id: string; name: string; avatar: string | null } }[];
};

type UserOption = { id: string; name: string; avatar: string | null };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [newDeptName, setNewDeptName] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDeptId, setNewTeamDeptId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());
  const [addMemberTeamId, setAddMemberTeamId] = useState<string | null>(null);
  const [addMemberUserId, setAddMemberUserId] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("MEMBER");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [depts, teamsData, usersData] = await Promise.all([
      getDepartments(),
      getTeamsWithDepartments(),
      getTeamUsers(),
    ]);
    setDepartments(depts as Department[]);
    setTeams(teamsData as TeamData[]);
    setUsers(usersData);
  }

  async function loadTeamsWithMembers() {
    const teamsData = await getTeamsWithDepartments();
    setTeams(teamsData as TeamData[]);
  }

  async function handleCreateDept(e: React.FormEvent) {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setLoading(true);
    setError("");

    try {
      const result = await createDepartment(newDeptName);
      if (result.success) {
        setNewDeptName("");
        loadAll();
      } else {
        setError(result.error || "Failed to create department");
      }
    } catch {
      setError("Failed to create department. You may not have admin permissions.");
    }
    setLoading(false);
  }

  async function handleDeleteDept(id: string) {
    const result = await deleteDepartment(id);
    if (result.success) {
      loadAll();
    } else {
      setError(result.error || "Failed to delete department");
    }
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || !newTeamDeptId) return;
    setLoading(true);
    setError("");

    const result = await createTeam(newTeamName, newTeamDeptId);
    if (result.success) {
      setNewTeamName("");
      setNewTeamDeptId("");
      setTeamDialogOpen(false);
      loadAll();
    } else {
      setError(result.error || "Failed to create team");
    }
    setLoading(false);
  }

  async function handleDeleteTeam(id: string) {
    if (!confirm("Delete this team? All tasks will also be deleted.")) return;
    startTransition(async () => {
      const result = await deleteTeam(id);
      if (result.success) {
        loadAll();
      } else {
        setError(result.error || "Failed to delete team");
      }
    });
  }

  async function handleAddMember(teamId: string) {
    if (!addMemberUserId) return;
    startTransition(async () => {
      const result = await addTeamMember(
        teamId,
        addMemberUserId,
        addMemberRole
      );
      if (result.success) {
        setAddMemberTeamId(null);
        setAddMemberUserId("");
        setAddMemberRole("MEMBER");
        loadTeamsWithMembers();
      } else {
        setError(result.error || "Failed to add member");
      }
    });
  }

  async function handleRemoveMember(teamId: string, userId: string) {
    startTransition(async () => {
      await removeTeamMember(teamId, userId);
      loadTeamsWithMembers();
    });
  }

  function toggleExpand(teamId: string) {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  // Group teams by department
  const teamsByDept = departments.map((dept) => ({
    dept,
    teams: teams.filter((t) => t.department.id === dept.id),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Departments & Teams</h1>
        <p className="text-muted-foreground">
          Manage your company structure — departments and teams within them
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            onClick={() => setError("")}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="inline h-3 w-3" />
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex gap-3">
        <form onSubmit={handleCreateDept} className="flex gap-2">
          <Input
            placeholder="New department name"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
            className="w-52"
          />
          <Button type="submit" variant="outline" disabled={loading} size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Department
          </Button>
        </form>

        <Dialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g., Team Flame"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={newTeamDeptId}
                  onValueChange={setNewTeamDeptId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Team"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Department & Team Cards */}
      {teamsByDept.map(({ dept, teams: deptTeams }) => (
        <Card key={dept.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{dept.name}</CardTitle>
                <Badge variant="outline" className="text-[10px]">
                  {dept._count.users} members
                </Badge>
              </div>
              {dept._count.users === 0 && deptTeams.length === 0 && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDeleteDept(dept.id)}
                  className="h-7 w-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {deptTeams.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No teams in this department yet.
              </p>
            ) : (
              <div className="space-y-3">
                {deptTeams.map((team) => {
                  const isExpanded = expandedTeams.has(team.id);

                  return (
                    <div key={team.id} className="rounded-lg border">
                      {/* Team header */}
                      <div className="flex items-center justify-between p-3">
                        <button
                          onClick={() => toggleExpand(team.id)}
                          className="flex items-center gap-2 text-left"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {team.name}
                          </span>
                        </button>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {team._count.members} members
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                          >
                            {team._count.teamTasks} tasks
                          </Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => {
                              setAddMemberTeamId(team.id);
                              setAddMemberUserId("");
                              setAddMemberRole("MEMBER");
                            }}
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteTeam(team.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Add member form */}
                      {addMemberTeamId === team.id && (
                        <div className="border-t bg-muted/20 px-3 py-3">
                          <div className="flex items-center gap-2">
                            <Select
                              value={addMemberUserId}
                              onValueChange={setAddMemberUserId}
                            >
                              <SelectTrigger className="h-8 w-48 text-xs">
                                <SelectValue placeholder="Select user..." />
                              </SelectTrigger>
                              <SelectContent>
                                {users.map((u) => (
                                  <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={addMemberRole}
                              onValueChange={setAddMemberRole}
                            >
                              <SelectTrigger className="h-8 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="LEAD">Lead</SelectItem>
                                <SelectItem value="MEMBER">Member</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="sm"
                              className="h-8 text-xs"
                              disabled={!addMemberUserId || isPending}
                              onClick={() => handleAddMember(team.id)}
                            >
                              Add
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setAddMemberTeamId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Expanded member list */}
                      {isExpanded && team.members && team.members.length > 0 && (
                        <div className="border-t px-3 py-2 space-y-1.5">
                          {team.members.map((member) => {
                            const initials = member.user.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);

                            return (
                              <div
                                key={member.id}
                                className="flex items-center justify-between py-1"
                              >
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[9px]">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-sm">
                                    {member.user.name}
                                  </span>
                                  {member.role === "LEAD" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] px-1.5 py-0"
                                    >
                                      Lead
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  onClick={() =>
                                    handleRemoveMember(
                                      team.id,
                                      member.userId
                                    )
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {isExpanded &&
                        (!team.members || team.members.length === 0) && (
                          <div className="border-t px-3 py-3">
                            <p className="text-xs text-muted-foreground">
                              No members yet. Click{" "}
                              <UserPlus className="inline h-3 w-3" /> to add
                              members.
                            </p>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {departments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No departments yet. Create your first department to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
