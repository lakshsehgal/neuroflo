"use client";

import { useState, useEffect, useTransition } from "react";
import { getTaskDetail, updateTask, addComment, deleteTask, createTaskRevision, addTaskFeedback, resolveTaskFeedback } from "@/actions/tasks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TaskChecklist } from "./task-checklist";
import { TaskSubtasks } from "./task-subtasks";
import { formatRelativeTime } from "@/lib/utils";
import { Calendar, User, Flag, Tag, Trash2, AtSign, Video, Link2, ExternalLink, Package, MessageSquare, CheckCircle2, Plus } from "lucide-react";

type Member = {
  userId: string;
  user: { id: string; name: string; email: string; avatar: string | null };
};

type Label = {
  id: string;
  name: string;
  color: string;
};

interface TaskDetailModalProps {
  taskId: string | null;
  projectId: string;
  members: Member[];
  labels: Label[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskDeleted?: () => void;
}

type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>;

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  RESEARCH: "Research",
  MOODBOARDING: "Moodboarding",
  ANGLES: "Angles",
  SCRIPTING: "Scripting",
  APPROVAL_PENDING: "Approval Pending",
  CREATOR_FINALISING: "Creator Finalising",
  PRODUCTION: "Production",
  POST_PRODUCTION: "Post Production",
  IN_REVISION: "In Revision",
  DELIVERED: "Delivered",
  ON_HOLD: "On Hold",
};

export function TaskDetailModal({
  taskId,
  projectId,
  members,
  labels,
  open,
  onOpenChange,
  onTaskDeleted,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [revisionUrl, setRevisionUrl] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [showAddRevision, setShowAddRevision] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRevisionId, setFeedbackRevisionId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState("");
  const [portfolioLink, setPortfolioLink] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");

  useEffect(() => {
    if (taskId && open) {
      setLoading(true);
      getTaskDetail(taskId).then((data) => {
        if (data) {
          setTask(data);
          setTitle(data.title);
          setDescription(data.description || "");
          setCreatorName(data.creatorName || "");
          setPortfolioLink(data.workPortfolioLink || "");
          setDeliveryLink(data.deliveryLink || "");
        }
        setLoading(false);
      });
    }
  }, [taskId, open]);

  function handleUpdateField(field: string, value: string) {
    if (!task) return;
    startTransition(async () => {
      await updateTask(task.id, { projectId, [field]: value });
      const updated = await getTaskDetail(task.id);
      if (updated) setTask(updated);
    });
  }

  function handleSaveTitle() {
    if (title.trim() && title !== task?.title) {
      handleUpdateField("title", title.trim());
    }
    setEditingTitle(false);
  }

  function handleSaveDescription() {
    if (description !== (task?.description || "")) {
      handleUpdateField("description", description);
    }
    setEditingDesc(false);
  }

  function handleAddComment() {
    if (!commentText.trim() || !task) return;
    startTransition(async () => {
      await addComment(commentText.trim(), task.id);
      setCommentText("");
      const updated = await getTaskDetail(task.id);
      if (updated) setTask(updated);
    });
  }

  function handleDeleteTask() {
    if (!task) return;
    startTransition(async () => {
      await deleteTask(task.id);
      onOpenChange(false);
      onTaskDeleted?.();
    });
  }

  function handleAddRevision() {
    if (!task || !revisionUrl.trim()) return;
    startTransition(async () => {
      await createTaskRevision(task.id, revisionUrl.trim(), revisionNote.trim() || undefined);
      setRevisionUrl("");
      setRevisionNote("");
      setShowAddRevision(false);
      const updated = await getTaskDetail(task.id);
      if (updated) setTask(updated);
    });
  }

  function handleAddFeedback(revId?: string) {
    if (!task || !feedbackText.trim()) return;
    startTransition(async () => {
      await addTaskFeedback(task.id, feedbackText.trim(), "Team", false, revId);
      setFeedbackText("");
      setFeedbackRevisionId(null);
      const updated = await getTaskDetail(task.id);
      if (updated) setTask(updated);
    });
  }

  function handleResolveFeedback(fbId: string) {
    if (!task) return;
    startTransition(async () => {
      await resolveTaskFeedback(fbId);
      const updated = await getTaskDetail(task.id);
      if (updated) setTask(updated);
    });
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {loading || !task ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-0">
              {editingTitle ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleSaveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveTitle();
                    if (e.key === "Escape") {
                      setTitle(task.title);
                      setEditingTitle(false);
                    }
                  }}
                  autoFocus
                  className="text-lg font-semibold"
                />
              ) : (
                <DialogTitle
                  className="cursor-pointer text-lg hover:text-primary"
                  onClick={() => setEditingTitle(true)}
                >
                  {task.title}
                </DialogTitle>
              )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Left column - main content */}
                <div className="space-y-5 md:col-span-2">
                  {/* Description */}
                  <div>
                    <h4 className="mb-2 text-sm font-semibold">Description</h4>
                    {editingDesc ? (
                      <div className="space-y-2">
                        <Textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveDescription}>
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDescription(task.description || "");
                              setEditingDesc(false);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="cursor-pointer rounded-md border border-transparent p-2 text-sm text-muted-foreground hover:border-border hover:text-foreground"
                        onClick={() => setEditingDesc(true)}
                      >
                        {task.description || "Click to add description..."}
                      </p>
                    )}
                  </div>

                  <Separator />

                  {/* Subtasks */}
                  <TaskSubtasks
                    taskId={task.id}
                    projectId={projectId}
                    subtasks={task.subtasks}
                  />

                  <Separator />

                  {/* Checklist */}
                  <TaskChecklist
                    taskId={task.id}
                    items={task.checklistItems}
                  />

                  <Separator />

                  {/* Comments */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold">
                      Comments ({task.comments.length})
                    </h4>

                    <div className="space-y-3">
                      {task.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback className="text-[10px]">
                              {comment.author.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(comment.createdAt)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                              {comment.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || isPending}
                    >
                      Comment
                    </Button>
                  </div>

                  <Separator />

                  {/* Revisions & Feedback */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        Video Revisions ({task.revisions?.length || 0})
                      </h4>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setShowAddRevision(!showAddRevision)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Version
                      </Button>
                    </div>

                    {showAddRevision && (
                      <div className="rounded-md border p-3 space-y-2">
                        <Input
                          placeholder="Video URL for this version"
                          value={revisionUrl}
                          onChange={(e) => setRevisionUrl(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <Input
                          placeholder="Note (optional)"
                          value={revisionNote}
                          onChange={(e) => setRevisionNote(e.target.value)}
                          className="h-8 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={handleAddRevision} disabled={!revisionUrl.trim() || isPending}>
                            {isPending ? "Saving..." : "Save Version"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddRevision(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {(task.revisions || []).map((rev) => (
                      <div key={rev.id} className="rounded-md border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              V{rev.version}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(rev.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <a href={rev.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        </div>
                        {rev.note && <p className="text-xs text-muted-foreground">{rev.note}</p>}

                        {/* Feedback on this revision */}
                        {rev.feedbacks && rev.feedbacks.length > 0 && (
                          <div className="space-y-1.5 pl-3 border-l-2 border-muted mt-2">
                            {rev.feedbacks.map((fb) => (
                              <div key={fb.id} className="flex items-start gap-2">
                                <MessageSquare className={`h-3 w-3 mt-0.5 shrink-0 ${fb.isClient ? "text-amber-500" : "text-blue-500"}`} />
                                <div className="flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-medium">{fb.authorName}</span>
                                    {fb.isClient && <Badge variant="secondary" className="text-[9px] h-4 bg-amber-100 text-amber-700">Client</Badge>}
                                    {fb.status === "RESOLVED" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                                  </div>
                                  <p className="text-xs text-muted-foreground">{fb.content}</p>
                                </div>
                                {fb.status !== "RESOLVED" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 shrink-0"
                                    onClick={() => handleResolveFeedback(fb.id)}
                                  >
                                    <CheckCircle2 className="h-3 w-3 text-muted-foreground hover:text-green-500" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add feedback to this revision */}
                        {feedbackRevisionId === rev.id ? (
                          <div className="flex gap-2 mt-2">
                            <Input
                              placeholder="Add feedback..."
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                              className="h-7 text-xs"
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleAddFeedback(rev.id)} disabled={!feedbackText.trim() || isPending}>
                              Send
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs text-muted-foreground"
                            onClick={() => { setFeedbackRevisionId(rev.id); setFeedbackText(""); }}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" /> Add Feedback
                          </Button>
                        )}
                      </div>
                    ))}

                    {(!task.revisions || task.revisions.length === 0) && !showAddRevision && (
                      <p className="text-xs text-muted-foreground">No versions uploaded yet.</p>
                    )}
                  </div>
                </div>

                {/* Right column - metadata */}
                <div className="space-y-4">
                  {/* Status */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      Status
                    </label>
                    <Select
                      value={task.status}
                      onValueChange={(v) => handleUpdateField("status", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Flag className="h-3 w-3" />
                      Priority
                    </label>
                    <Select
                      value={task.priority}
                      onValueChange={(v) => handleUpdateField("priority", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                          <SelectItem key={p} value={p}>
                            <Badge
                              className={`${priorityColors[p]} text-xs`}
                              variant="secondary"
                            >
                              {p}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Assignee */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <User className="h-3 w-3" />
                      Assignee
                    </label>
                    <Select
                      value={task.assigneeId || "unassigned"}
                      onValueChange={(v) =>
                        handleUpdateField(
                          "assigneeId",
                          v === "unassigned" ? "" : v
                        )
                      }
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {m.user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={
                        task.dueDate
                          ? new Date(task.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdateField("dueDate", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Creator Name */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <AtSign className="h-3 w-3" />
                      Creator
                    </label>
                    <Input
                      placeholder="Creator name..."
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      onBlur={() => {
                        if (creatorName !== (task.creatorName || "")) {
                          handleUpdateField("creatorName", creatorName);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Work Portfolio Link */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Link2 className="h-3 w-3" />
                      Portfolio Link
                    </label>
                    <Input
                      placeholder="https://..."
                      value={portfolioLink}
                      onChange={(e) => setPortfolioLink(e.target.value)}
                      onBlur={() => {
                        if (portfolioLink !== (task.workPortfolioLink || "")) {
                          handleUpdateField("workPortfolioLink", portfolioLink);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Shoot Date */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Video className="h-3 w-3" />
                      Shoot Date
                    </label>
                    <Input
                      type="date"
                      value={
                        task.shootDate
                          ? new Date(task.shootDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdateField("shootDate", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Delivery / Final Video Link */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      Delivery / Video Link
                    </label>
                    <Input
                      placeholder="https://drive.google.com/..."
                      value={deliveryLink}
                      onChange={(e) => setDeliveryLink(e.target.value)}
                      onBlur={() => {
                        if (deliveryLink !== (task.deliveryLink || "")) {
                          handleUpdateField("deliveryLink", deliveryLink);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Est Delivery Date */}
                  <div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Package className="h-3 w-3" />
                      Est. Delivery Date
                    </label>
                    <Input
                      type="date"
                      value={
                        task.estimatedDeliveryDate
                          ? new Date(task.estimatedDeliveryDate).toISOString().split("T")[0]
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdateField("estimatedDeliveryDate", e.target.value)
                      }
                      className="h-8 text-sm"
                    />
                  </div>

                  {/* Labels */}
                  {task.labels.length > 0 && (
                    <div>
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        Labels
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {task.labels.map((label) => (
                          <Badge
                            key={label.id}
                            variant="outline"
                            className="text-xs"
                            style={{
                              borderColor: label.color,
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                  {/* Delete */}
                  <Separator className="my-3" />
                  {!showDeleteConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Delete Task
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-600 font-medium">Delete this task? This cannot be undone.</p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={() => setShowDeleteConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 h-7 text-xs"
                          onClick={handleDeleteTask}
                          disabled={isPending}
                        >
                          {isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
