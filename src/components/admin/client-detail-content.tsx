"use client";

import { useState, useTransition } from "react";
import { updateClient, updateClientField, updateClientMandates, createInvoice, updateInvoiceStatus, updateInvoice, deleteInvoice } from "@/actions/clients";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDate } from "@/lib/utils";
import { AnimatedTableBody, AnimatedRow } from "@/components/motion";
import { Plus, ArrowLeft, Link2, Copy, CheckCircle2, UserPlus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { generateOnboardingToken } from "@/actions/onboarding";
import type { getClient } from "@/actions/clients";

type ClientData = NonNullable<Awaited<ReturnType<typeof getClient>>>;

type OnboardingData = {
  id: string;
  clientId: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  authorisedSignatory: string | null;
  gstin: string | null;
  legalCompanyName: string | null;
  shopifyCollaboratorCode: string | null;
  googleAdAccountId: string | null;
  gstCertificateUrl: string | null;
  metaBmId: string | null;
  metaPageAccess: boolean;
  metaAdAccountAccess: boolean;
  googleAdsAccess: boolean;
  googleAnalyticsAccess: boolean;
  googleSearchConsole: boolean;
  shopifyAccess: boolean;
  websiteAccess: boolean;
  otherAccesses: string | null;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
} | null;

const clientStatusOptions = [
  { value: "ACTIVE", label: "Active", color: "bg-green-100 text-green-800" },
  { value: "CHURNED", label: "Churned", color: "bg-red-100 text-red-800" },
];

const sentimentOptions = [
  { value: "HAPPY", label: "Happy", color: "bg-green-100 text-green-800" },
  { value: "NEUTRAL", label: "Neutral", color: "bg-gray-100 text-gray-800" },
  { value: "AT_RISK", label: "At Risk", color: "bg-orange-100 text-orange-800" },
  { value: "CHURNED", label: "Churned", color: "bg-red-100 text-red-800" },
];

const invoiceStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const MANDATE_OPTIONS = [
  "Meta Ads",
  "Google Ads",
  "Post-Production",
  "UGCs",
  "Whatsapp Marketing",
  "CRO",
  "Statics Only",
];

const MANDATE_COLORS: Record<string, string> = {
  "Meta Ads": "bg-blue-100 text-blue-800",
  "Google Ads": "bg-green-100 text-green-800",
  "Post-Production": "bg-purple-100 text-purple-800",
  "UGCs": "bg-amber-100 text-amber-800",
  "Whatsapp Marketing": "bg-emerald-100 text-emerald-800",
  "CRO": "bg-red-100 text-red-800",
  "Statics Only": "bg-slate-100 text-slate-800",
};

export function ClientDetailContent({ client: initial, onboarding: initialOnboarding, ownerCandidates = [] }: { client: ClientData; onboarding?: OnboardingData; ownerCandidates?: { id: string; name: string }[] }) {
  const [client, setClient] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [onboardingLink, setOnboardingLink] = useState<string | null>(
    initial.onboardingToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/onboarding/${initial.onboardingToken}` : null
  );
  const [copied, setCopied] = useState(false);

  // Edit form
  const [form, setForm] = useState({
    sow: client.sow || "",
    status: client.status,
    performanceSentiment: client.performanceSentiment,
    creativeSentiment: client.creativeSentiment,
    avgBillingAmount: client.avgBillingAmount?.toString() || "",
    oneTimeProjectAmount: client.oneTimeProjectAmount?.toString() || "",
    decidedCommercials: client.decidedCommercials || "",
    invoicingDueDay: client.invoicingDueDay?.toString() || "",
    reminderDaysBefore: client.reminderDaysBefore.toString(),
    notes: client.notes || "",
  });

  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({
    amount: "", dueDate: "", invoiceNumber: "", notes: "",
  });

  function handleSave() {
    startTransition(async () => {
      await updateClient(client.id, {
        name: client.name,
        sow: form.sow || undefined,
        status: form.status as "ACTIVE" | "CHURNED",
        performanceSentiment: form.performanceSentiment as "HAPPY" | "NEUTRAL" | "AT_RISK" | "CHURNED",
        creativeSentiment: form.creativeSentiment as "HAPPY" | "NEUTRAL" | "AT_RISK" | "CHURNED",
        avgBillingAmount: form.avgBillingAmount ? parseFloat(form.avgBillingAmount) : null,
        oneTimeProjectAmount: form.oneTimeProjectAmount ? parseFloat(form.oneTimeProjectAmount) : null,
        decidedCommercials: form.decidedCommercials || undefined,
        invoicingDueDay: form.invoicingDueDay ? parseInt(form.invoicingDueDay) : null,
        reminderDaysBefore: parseInt(form.reminderDaysBefore) || 3,
        notes: form.notes || undefined,
      });
      setEditing(false);
    });
  }

  function handleCreateInvoice(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await createInvoice({
        clientId: client.id,
        amount: parseFloat(invoiceForm.amount),
        dueDate: invoiceForm.dueDate,
        invoiceNumber: invoiceForm.invoiceNumber || undefined,
        notes: invoiceForm.notes || undefined,
      });
      setInvoiceDialogOpen(false);
      setInvoiceForm({ amount: "", dueDate: "", invoiceNumber: "", notes: "" });
      window.location.reload();
    });
  }

  function handleInvoiceStatus(id: string, status: "PENDING" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED") {
    startTransition(async () => {
      await updateInvoiceStatus(id, status);
      window.location.reload();
    });
  }

  const [editingInvoice, setEditingInvoice] = useState<string | null>(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({ amount: "", dueDate: "", invoiceNumber: "", notes: "" });

  function startEditInvoice(inv: { id: string; amount: number; dueDate: string | Date; invoiceNumber?: string | null; notes?: string | null }) {
    setEditingInvoice(inv.id);
    setEditInvoiceForm({
      amount: inv.amount.toString(),
      dueDate: new Date(inv.dueDate).toISOString().split("T")[0],
      invoiceNumber: inv.invoiceNumber || "",
      notes: inv.notes || "",
    });
  }

  function handleEditInvoice(e: React.FormEvent) {
    e.preventDefault();
    if (!editingInvoice) return;
    startTransition(async () => {
      await updateInvoice(editingInvoice, {
        amount: parseFloat(editInvoiceForm.amount),
        dueDate: editInvoiceForm.dueDate,
        invoiceNumber: editInvoiceForm.invoiceNumber || undefined,
        notes: editInvoiceForm.notes || undefined,
      });
      setEditingInvoice(null);
      window.location.reload();
    });
  }

  function handleDeleteInvoice(id: string) {
    if (!confirm("Delete this invoice? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteInvoice(id);
      window.location.reload();
    });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const totalPaid = client.invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const totalPending = client.invoices.filter((i) => ["PENDING", "SENT", "OVERDUE"].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/admin/clients"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-bold">{client.name}</h1>
          {client.industry && <p className="text-sm text-muted-foreground">{client.industry}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Details */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Client Details</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                {editing ? "Cancel" : "Edit"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <>
                  <div className="space-y-2">
                    <Label>SOW (Scope of Work)</Label>
                    <Textarea value={form.sow} onChange={(e) => setForm({ ...form, sow: e.target.value })} rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as ClientData["status"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clientStatusOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Avg Monthly Billing</Label>
                      <Input type="number" value={form.avgBillingAmount} onChange={(e) => setForm({ ...form, avgBillingAmount: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Performance Sentiment</Label>
                      <Select value={form.performanceSentiment} onValueChange={(v) => setForm({ ...form, performanceSentiment: v as ClientData["performanceSentiment"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sentimentOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Creative Sentiment</Label>
                      <Select value={form.creativeSentiment} onValueChange={(v) => setForm({ ...form, creativeSentiment: v as ClientData["creativeSentiment"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sentimentOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>One-Time Project Amount</Label>
                      <Input type="number" value={form.oneTimeProjectAmount} onChange={(e) => setForm({ ...form, oneTimeProjectAmount: e.target.value })} placeholder="For creative one-time projects" />
                    </div>
                    <div className="space-y-2">
                      <Label>Decided Commercials</Label>
                      <Input value={form.decidedCommercials} onChange={(e) => setForm({ ...form, decidedCommercials: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Invoice Due Day</Label>
                      <Input type="number" min={1} max={28} value={form.invoicingDueDay} onChange={(e) => setForm({ ...form, invoicingDueDay: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Reminder Days Before</Label>
                      <Input type="number" value={form.reminderDaysBefore} onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                  </div>
                  <Button onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge className={`mt-1 ${clientStatusOptions.find((s) => s.value === client.status)?.color || ""}`} variant="secondary">
                      {clientStatusOptions.find((s) => s.value === client.status)?.label || client.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Performance Sentiment</p>
                    <Badge className={`mt-1 ${sentimentOptions.find((s) => s.value === client.performanceSentiment)?.color || ""}`} variant="secondary">
                      {sentimentOptions.find((s) => s.value === client.performanceSentiment)?.label || "—"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Creative Sentiment</p>
                    <Badge className={`mt-1 ${sentimentOptions.find((s) => s.value === client.creativeSentiment)?.color || ""}`} variant="secondary">
                      {sentimentOptions.find((s) => s.value === client.creativeSentiment)?.label || "—"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Monthly Billing</p>
                    <p className="mt-1 text-sm font-medium">{client.avgBillingAmount ? fmt(client.avgBillingAmount) : "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">One-Time Project</p>
                    <p className="mt-1 text-sm font-medium">{client.oneTimeProjectAmount ? fmt(client.oneTimeProjectAmount) : "\u2014"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Decided Commercials</p>
                    <p className="mt-1 text-sm">{client.decidedCommercials || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Invoice Due Day</p>
                    <p className="mt-1 text-sm">{client.invoicingDueDay ? `Day ${client.invoicingDueDay} of month` : "—"}</p>
                  </div>
                  {client.sow && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">SOW</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{client.sow}</p>
                    </div>
                  )}
                  {client.notes && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{client.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Owners & Mandates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Owners & Mandates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Owner Assignment */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Primary Performance Owner</Label>
                  <Select
                    value={client.primaryPerformanceOwner?.id || "none"}
                    onValueChange={(v) => {
                      startTransition(async () => {
                        await updateClientField(client.id, "primaryPerformanceOwnerId", v === "none" ? null : v);
                        window.location.reload();
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {ownerCandidates.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Secondary Performance Owner</Label>
                  <Select
                    value={client.secondaryPerformanceOwner?.id || "none"}
                    onValueChange={(v) => {
                      startTransition(async () => {
                        await updateClientField(client.id, "secondaryPerformanceOwnerId", v === "none" ? null : v);
                        window.location.reload();
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {ownerCandidates.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Creative Strategy Owner</Label>
                  <Select
                    value={client.creativeStrategyOwner?.id || "none"}
                    onValueChange={(v) => {
                      startTransition(async () => {
                        await updateClientField(client.id, "creativeStrategyOwnerId", v === "none" ? null : v);
                        window.location.reload();
                      });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {ownerCandidates.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Mandates */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Mandates</Label>
                <div className="flex flex-wrap gap-1.5">
                  {MANDATE_OPTIONS.map((mandate) => {
                    const isActive = (client.mandates || []).includes(mandate);
                    return (
                      <button
                        key={mandate}
                        type="button"
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          isActive
                            ? MANDATE_COLORS[mandate] || "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                        onClick={() => {
                          const currentMandates = client.mandates || [];
                          const newMandates = isActive
                            ? currentMandates.filter((m) => m !== mandate)
                            : [...currentMandates, mandate];
                          startTransition(async () => {
                            await updateClientMandates(client.id, newMandates);
                            window.location.reload();
                          });
                        }}
                        disabled={isPending}
                      >
                        {mandate}
                      </button>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoices */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Invoices ({client.invoices.length})</CardTitle>
              <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="mr-1 h-3.5 w-3.5" />Add Invoice</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
                  <form onSubmit={handleCreateInvoice} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Amount *</Label>
                        <Input type="number" step="0.01" value={invoiceForm.amount} onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Due Date *</Label>
                        <Input type="date" value={invoiceForm.dueDate} onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Invoice Number</Label>
                      <Input value={invoiceForm.invoiceNumber} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })} placeholder="INV-001" />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <Input value={invoiceForm.notes} onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "Creating..." : "Create Invoice"}</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {client.invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No invoices yet.</p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left text-xs font-medium">Invoice #</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Due Date</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium">Actions</th>
                      </tr>
                    </thead>
                    <AnimatedTableBody>
                      {client.invoices.map((inv) => (
                        <AnimatedRow key={inv.id} className="border-b last:border-0">
                          <td className="px-3 py-2 text-sm">{inv.invoiceNumber || "—"}</td>
                          <td className="px-3 py-2 text-sm font-medium">{fmt(inv.amount)}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{formatDate(inv.dueDate)}</td>
                          <td className="px-3 py-2">
                            <Badge className={`${invoiceStatusColors[inv.status]} text-[10px]`} variant="secondary">{inv.status}</Badge>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <Select value={inv.status} onValueChange={(v) => handleInvoiceStatus(inv.id, v as "PENDING" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED")}>
                                <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="SENT">Sent</SelectItem>
                                  <SelectItem value="PAID">Paid</SelectItem>
                                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEditInvoice(inv)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeleteInvoice(inv.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </AnimatedRow>
                      ))}
                    </AnimatedTableBody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Invoice Dialog */}
          <Dialog open={!!editingInvoice} onOpenChange={(open) => { if (!open) setEditingInvoice(null); }}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Invoice</DialogTitle></DialogHeader>
              <form onSubmit={handleEditInvoice} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" step="0.01" value={editInvoiceForm.amount} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, amount: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date *</Label>
                    <Input type="date" value={editInvoiceForm.dueDate} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, dueDate: e.target.value })} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number</Label>
                  <Input value={editInvoiceForm.invoiceNumber} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, invoiceNumber: e.target.value })} placeholder="INV-001" />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={editInvoiceForm.notes} onChange={(e) => setEditInvoiceForm({ ...editInvoiceForm, notes: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setEditingInvoice(null)}>Cancel</Button>
                  <Button type="submit" className="flex-1" disabled={isPending}>{isPending ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Total Paid</p>
                <p className="text-lg font-bold text-green-600">{fmt(totalPaid)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-lg font-bold text-orange-600">{fmt(totalPending)}</p>
              </div>
              {client.contactEmail && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact Email</p>
                  <p className="mt-1 text-sm">{client.contactEmail}</p>
                </div>
              )}
              {client.contactPhone && (
                <div>
                  <p className="text-xs text-muted-foreground">Contact Phone</p>
                  <p className="mt-1 text-sm">{client.contactPhone}</p>
                </div>
              )}
              {client.website && (
                <div>
                  <p className="text-xs text-muted-foreground">Website</p>
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="mt-1 text-sm text-primary hover:underline">{client.website}</a>
                </div>
              )}
            </CardContent>
          </Card>

          {client.projects.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">Projects ({client.projects.length})</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {client.projects.map((p) => (
                    <div key={p.id} className="flex items-center rounded-md border p-2">
                      <span className="text-sm">{p.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Onboarding */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Client Onboarding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {onboardingLink ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Onboarding link:</p>
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={onboardingLink}
                      readOnly
                      className="h-8 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        navigator.clipboard.writeText(onboardingLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                    >
                      {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await generateOnboardingToken(client.id);
                        if (result.success && result.data) {
                          const link = `${window.location.origin}/onboarding/${result.data.token}`;
                          setOnboardingLink(link);
                        }
                      });
                    }}
                  >
                    <Link2 className="mr-1.5 h-3 w-3" />
                    {isPending ? "Regenerating..." : "Regenerate Link"}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await generateOnboardingToken(client.id);
                      if (result.success && result.data) {
                        const link = `${window.location.origin}/onboarding/${result.data.token}`;
                        setOnboardingLink(link);
                      }
                    });
                  }}
                >
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  {isPending ? "Starting..." : "Start Onboarding"}
                </Button>
              )}

              {/* Onboarding responses */}
              {initialOnboarding && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <p className="text-xs font-medium text-green-700">Form Submitted</p>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatDate(initialOnboarding.submittedAt)}
                    </span>
                  </div>
                  {initialOnboarding.contactName && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Name</p>
                      <p className="text-xs">{initialOnboarding.contactName}</p>
                    </div>
                  )}
                  {initialOnboarding.contactEmail && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Email</p>
                      <p className="text-xs">{initialOnboarding.contactEmail}</p>
                    </div>
                  )}
                  {initialOnboarding.contactPhone && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Phone</p>
                      <p className="text-xs">{initialOnboarding.contactPhone}</p>
                    </div>
                  )}
                  {initialOnboarding.authorisedSignatory && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Authorised Signatory</p>
                      <p className="text-xs">{initialOnboarding.authorisedSignatory}</p>
                    </div>
                  )}
                  {initialOnboarding.gstin && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">GSTIN</p>
                      <p className="text-xs font-mono">{initialOnboarding.gstin}</p>
                    </div>
                  )}
                  {initialOnboarding.legalCompanyName && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Legal Company Name</p>
                      <p className="text-xs">{initialOnboarding.legalCompanyName}</p>
                    </div>
                  )}
                  {initialOnboarding.shopifyCollaboratorCode && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Shopify Collaborator Code</p>
                      <p className="text-xs font-mono">{initialOnboarding.shopifyCollaboratorCode}</p>
                    </div>
                  )}
                  {initialOnboarding.googleAdAccountId && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Google Ad Account ID</p>
                      <p className="text-xs font-mono">{initialOnboarding.googleAdAccountId}</p>
                    </div>
                  )}
                  {initialOnboarding.gstCertificateUrl && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">GST Certificate</p>
                      <p className="text-xs text-green-600">Uploaded</p>
                    </div>
                  )}
                  {initialOnboarding.metaBmId && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">Meta BM ID</p>
                      <p className="text-xs font-mono">{initialOnboarding.metaBmId}</p>
                    </div>
                  )}
                  {/* Accesses summary */}
                  {(initialOnboarding.metaPageAccess || initialOnboarding.metaAdAccountAccess || initialOnboarding.googleAdsAccess || initialOnboarding.googleAnalyticsAccess || initialOnboarding.googleSearchConsole || initialOnboarding.shopifyAccess || initialOnboarding.websiteAccess) && (
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-1">Accesses Granted</p>
                      <div className="flex flex-wrap gap-1">
                        {initialOnboarding.metaPageAccess && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">Meta Page</span>}
                        {initialOnboarding.metaAdAccountAccess && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-700">Meta Ads</span>}
                        {initialOnboarding.googleAdsAccess && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">Google Ads</span>}
                        {initialOnboarding.googleAnalyticsAccess && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">GA4</span>}
                        {initialOnboarding.googleSearchConsole && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">Search Console</span>}
                        {initialOnboarding.shopifyAccess && <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] text-purple-700">Shopify</span>}
                        {initialOnboarding.websiteAccess && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-700">Website</span>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
