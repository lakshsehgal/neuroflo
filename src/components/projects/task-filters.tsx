"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";

type Member = {
  userId: string;
  user: { id: string; name: string; avatar: string | null };
};

type Label = {
  id: string;
  name: string;
  color: string;
};

export type FilterState = {
  search: string;
  assignees: string[];
  priorities: string[];
  labels: string[];
  dueDate: string;
};

interface TaskFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  members: Member[];
  labels: Label[];
}

const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  MEDIUM: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  HIGH: "bg-orange-100 text-orange-700 hover:bg-orange-200",
  URGENT: "bg-red-100 text-red-700 hover:bg-red-200",
};

export function TaskFilters({
  filters,
  onFiltersChange,
  members,
  labels,
}: TaskFiltersProps) {
  const hasFilters =
    filters.search ||
    filters.assignees.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.dueDate !== "all";

  function toggleFilter(
    key: "assignees" | "priorities" | "labels",
    value: string
  ) {
    const current = filters[key];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFiltersChange({ ...filters, [key]: updated });
  }

  function clearAll() {
    onFiltersChange({ search: "", assignees: [], priorities: [], labels: [], dueDate: "all" });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) =>
              onFiltersChange({ ...filters, search: e.target.value })
            }
            className="h-8 pl-8 text-sm"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
        </div>

        {/* Priority filters */}
        <div className="flex gap-1">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => toggleFilter("priorities", p)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-all ${
                filters.priorities.includes(p)
                  ? `${priorityColors[p]} ring-1 ring-current`
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Assignee chips */}
        {members.length > 0 && (
          <div className="flex gap-1">
            {members.slice(0, 5).map((m) => (
              <button
                key={m.userId}
                onClick={() => toggleFilter("assignees", m.userId)}
                title={m.user.name}
              >
                <Avatar
                  className={`h-6 w-6 transition-all ${
                    filters.assignees.includes(m.userId)
                      ? "ring-2 ring-primary"
                      : "opacity-50 hover:opacity-100"
                  }`}
                >
                  <AvatarFallback className="text-[8px]">
                    {m.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
              </button>
            ))}
          </div>
        )}

        {/* Label chips */}
        {labels.length > 0 && (
          <div className="flex gap-1">
            {labels.slice(0, 5).map((l) => (
              <button
                key={l.id}
                onClick={() => toggleFilter("labels", l.id)}
                className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all ${
                  filters.labels.includes(l.id)
                    ? "bg-muted ring-1 ring-primary"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.name}
              </button>
            ))}
          </div>
        )}

        {/* Due Date filter */}
        <Select value={filters.dueDate} onValueChange={(v) => onFiltersChange({ ...filters, dueDate: v })}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="Due Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Due Dates</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="today">Due Today</SelectItem>
            <SelectItem value="this_week">Due This Week</SelectItem>
            <SelectItem value="this_month">Due This Month</SelectItem>
            <SelectItem value="no_date">No Due Date</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear */}
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-7 text-xs text-muted-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
