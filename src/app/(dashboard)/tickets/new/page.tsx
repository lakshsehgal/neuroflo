"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createTicket, getTeamUsers, getClientNames } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ExternalLink,
  Image,
  Film,
  Users,
  Sparkles,
  Layers,
  Frame,
  FileText,
  Link2,
  Calendar,
  UserCircle,
  Building2,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Loader2,
  AlertCircle,
  PenTool,
  RefreshCw,
} from "lucide-react";

type User = { id: string; name: string; avatar: string | null };
type ClientItem = { id: string; name: string };

const FORMAT_OPTIONS = [
  { value: "STATIC", label: "Static", icon: Image, description: "Single image" },
  { value: "VIDEO", label: "Video", icon: Film, description: "Motion content" },
  { value: "UGC", label: "UGC", icon: Users, description: "User-generated" },
  { value: "GIF", label: "GIF", icon: Sparkles, description: "Animated loop" },
  { value: "CAROUSEL", label: "Carousel", icon: Layers, description: "Multi-slide" },
  { value: "DPA_FRAME", label: "DPA Frame", icon: Frame, description: "Dynamic product" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200", activeColor: "bg-slate-600 text-white border-slate-600", dot: "bg-slate-400" },
  { value: "MEDIUM", label: "Medium", color: "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100", activeColor: "bg-blue-600 text-white border-blue-600", dot: "bg-blue-400" },
  { value: "HIGH", label: "High", color: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100", activeColor: "bg-amber-600 text-white border-amber-600", dot: "bg-amber-400" },
  { value: "URGENT", label: "Urgent", color: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100", activeColor: "bg-red-600 text-white border-red-600", dot: "bg-red-400" },
] as const;

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [customClient, setCustomClient] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [format, setFormat] = useState("");
  const [creativeType, setCreativeType] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [creativeBriefUrl, setCreativeBriefUrl] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");

  useEffect(() => {
    Promise.all([getTeamUsers(), getClientNames()]).then(([u, c]) => {
      setUsers(u);
      setClients(c);
    });
  }, []);

  const completedSections = useMemo(() => {
    const s1 = !!(title && (clientName && clientName !== "__custom__" ? clientName : customClient));
    const s2 = !!(format || creativeType || priority !== "MEDIUM");
    const s3 = !!(creativeBriefUrl || deliveryLink);
    return { s1, s2, s3, count: [s1, s2, s3].filter(Boolean).length };
  }, [title, clientName, customClient, format, creativeType, priority, creativeBriefUrl, deliveryLink]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const finalClientName =
      clientName === "__custom__" ? customClient : clientName;

    const result = await createTicket({
      title,
      clientName: finalClientName || undefined,
      assigneeId: assigneeId || undefined,
      format: (format || undefined) as
        | "STATIC" | "VIDEO" | "UGC" | "GIF" | "CAROUSEL" | "DPA_FRAME" | undefined,
      creativeType: (creativeType || undefined) as "NET_NEW" | "ITERATION" | undefined,
      priority: priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      dueDate: dueDate || undefined,
      creativeBriefUrl: creativeBriefUrl || undefined,
      deliveryLink: deliveryLink || undefined,
    });

    if (result.success && result.data) {
      router.push(`/tickets/${result.data.id}`);
    } else {
      setError(result.error || "Failed to create ticket");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-12">
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">New Creative Request</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Submit a structured brief so your creative team can deliver exactly what you need.
            </p>
          </div>
          {/* Progress indicator */}
          <div className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-1.5">
            {[completedSections.s1, completedSections.s2, completedSections.s3].map((done, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/30" />
                )}
                {i < 2 && <div className={`h-px w-4 ${done ? "bg-emerald-500" : "bg-muted-foreground/20"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Section 1: Basic Info */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                1
              </div>
              <div>
                <CardTitle className="text-base">Basic Information</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">What is this request about?</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Request Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="e.g., Q2 Summer Campaign - Hero Banner Set"
                className="h-11 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Be specific -- include campaign name, asset type, or deliverable.
              </p>
            </div>

            {/* Client + Due Date row */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-sm font-medium">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Client
                </Label>
                <Select value={clientName} onValueChange={setClientName}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                    <SelectItem value="__custom__">+ Add new client...</SelectItem>
                  </SelectContent>
                </Select>
                {clientName === "__custom__" && (
                  <Input
                    placeholder="Enter client name..."
                    value={customClient}
                    onChange={(e) => setCustomClient(e.target.value)}
                    autoFocus
                    className="h-10"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate" className="flex items-center gap-1.5 text-sm font-medium">
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

            {/* Assignee */}
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
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Creative Details */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                2
              </div>
              <div>
                <CardTitle className="text-base">Creative Details</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">What kind of creative do you need?</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Format - visual card grid */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Format</Label>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {FORMAT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = format === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormat(isActive ? "" : opt.value)}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-lg border-2 px-3 py-3.5 text-center transition-all ${
                        isActive
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-transparent bg-muted/40 hover:border-muted-foreground/20 hover:bg-muted/70"
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                        {opt.label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{opt.description}</span>
                      {isActive && (
                        <div className="absolute right-1.5 top-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Creative Type - two card toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Creative Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCreativeType(creativeType === "NET_NEW" ? "" : "NET_NEW")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                    creativeType === "NET_NEW"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/40 hover:border-muted-foreground/20 hover:bg-muted/70"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    creativeType === "NET_NEW" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <PenTool className={`h-4 w-4 ${creativeType === "NET_NEW" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${creativeType === "NET_NEW" ? "text-primary" : "text-foreground"}`}>Net New</div>
                    <div className="text-xs text-muted-foreground">Built from scratch</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCreativeType(creativeType === "ITERATION" ? "" : "ITERATION")}
                  className={`flex items-center gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                    creativeType === "ITERATION"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-transparent bg-muted/40 hover:border-muted-foreground/20 hover:bg-muted/70"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    creativeType === "ITERATION" ? "bg-primary/10" : "bg-muted"
                  }`}>
                    <RefreshCw className={`h-4 w-4 ${creativeType === "ITERATION" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <div className={`text-sm font-medium ${creativeType === "ITERATION" ? "text-primary" : "text-foreground"}`}>Iteration</div>
                    <div className="text-xs text-muted-foreground">Based on existing work</div>
                  </div>
                </button>
              </div>
            </div>

            <Separator />

            {/* Priority - colored pill buttons */}
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
                      <span className={`h-2 w-2 rounded-full ${isActive ? "bg-white/80" : opt.dot}`} />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Links & References */}
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                3
              </div>
              <div>
                <CardTitle className="text-base">Links & References</CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">Attach briefs, docs, and delivery destinations</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            {/* Creative Brief URL */}
            <div className="space-y-2">
              <Label htmlFor="briefUrl" className="flex items-center gap-1.5 text-sm font-medium">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Creative Brief
              </Label>
              <div className="flex gap-2">
                <Input
                  id="briefUrl"
                  value={creativeBriefUrl}
                  onChange={(e) => setCreativeBriefUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="h-11"
                />
                {creativeBriefUrl && (
                  <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" asChild>
                    <a href={creativeBriefUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a Google Doc link with your creative brief. The more detail, the better the output.
              </p>
            </div>

            <Separator />

            {/* Delivery Link */}
            <div className="space-y-2">
              <Label htmlFor="deliveryLink" className="flex items-center gap-1.5 text-sm font-medium">
                <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                Delivery Destination
              </Label>
              <Input
                id="deliveryLink"
                value={deliveryLink}
                onChange={(e) => setDeliveryLink(e.target.value)}
                placeholder="Where should the final assets be delivered?"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Shared drive, Figma link, or folder where deliverables should land.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submit bar */}
        <div className="flex items-center justify-between rounded-lg border bg-card px-6 py-4">
          <div className="text-sm text-muted-foreground">
            {completedSections.count === 0 && "Fill out the sections above to submit your request."}
            {completedSections.count === 1 && "Good start -- keep going to create a complete brief."}
            {completedSections.count === 2 && "Almost there -- one more section to go."}
            {completedSections.count === 3 && (
              <span className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Looking great -- ready to submit!
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
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
                "Submit Request"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
