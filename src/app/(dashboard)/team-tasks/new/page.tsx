"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createTeamTask, getTeamsWithDepartments } from "@/actions/team-tasks";
import { getTeamUsers } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Calendar,
  UserCircle,
  Users,
} from "lucide-react";

type User = { id: string; name: string; avatar: string | null };
type TeamInfo = {
  id: string;
  name: string;
  department: { id: string; name: string };
};

const PRIORITY_OPTIONS = [
  {
    value: "LOW",
    label: "Low",
    color:
      "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200",
    activeColor: "bg-slate-600 text-white border-slate-600",
    dot: "bg-slate-400",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
    activeColor: "bg-blue-600 text-white border-blue-600",
    dot: "bg-blue-400",
  },
  {
    value: "HIGH",
    label: "High",
    color:
      "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
    activeColor: "bg-amber-600 text-white border-amber-600",
    dot: "bg-amber-400",
  },
  {
    value: "URGENT",
    label: "Urgent",
    color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100",
    activeColor: "bg-red-600 text-white border-red-600",
    dot: "bg-red-400",
  },
] as const;

export default function NewTeamTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<TeamInfo[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    Promise.all([getTeamUsers(), getTeamsWithDepartments()]).then(
      ([u, t]) => {
        setUsers(u);
        setTeams(
          t.map((team) => ({
            id: team.id,
            name: team.name,
            department: team.department,
          }))
        );
      }
    );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError("Please select a team");
      return;
    }
    setLoading(true);
    setError("");

    const result = await createTeamTask({
      teamId,
      title,
      description: description || undefined,
      priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      assigneeId: assigneeId || undefined,
      dueDate: dueDate || undefined,
    });

    if (result.success) {
      router.push("/team-tasks");
    } else {
      setError(result.error || "Failed to create task");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-12">
      {/* Header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="group mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">
          New Team Task
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a task and assign it to a team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Task Details */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </div>
              <div>
                <CardTitle className="text-base">Task Details</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  What needs to be done?
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Prepare Q2 campaign strategy deck"
                className="h-11 text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details about the task..."
                rows={3}
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  Team <span className="text-red-500">*</span>
                </Label>
                <Select value={teamId} onValueChange={setTeamId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} ({t.department.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="dueDate"
                  className="flex items-center gap-1.5 text-sm font-medium"
                >
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Due Date
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium">
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Assignee
              </Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Who should work on this?" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Priority</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORITY_OPTIONS.map((opt) => {
                  const isActive = priority === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        isActive ? opt.activeColor : opt.color
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${isActive ? "bg-white/80" : opt.dot}`}
                      />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 rounded-lg border bg-card px-6 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            className="text-muted-foreground"
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="min-w-[140px]">
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Task"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
