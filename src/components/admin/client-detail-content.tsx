"use client";

import { useState, useTransition } from "react";
import { updateClient, createInvoice, updateInvoiceStatus } from "@/actions/clients";
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
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { getClient } from "@/actions/clients";

type ClientData = NonNullable<Awaited<ReturnType<typeof getClient>>>;

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

export function ClientDetailContent({ client: initial }: { client: ClientData }) {
  const [client, setClient] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form
  const [form, setForm] = useState({
    sow: client.sow || "",
    status: client.status,
    sentimentStatus: client.sentimentStatus,
    avgBillingAmount: client.avgBillingAmount?.toString() || "",
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
        sentimentStatus: form.sentimentStatus as "HAPPY" | "NEUTRAL" | "AT_RISK" | "CHURNED",
        avgBillingAmount: form.avgBillingAmount ? parseFloat(form.avgBillingAmount) : null,
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
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {clientStatusOptions.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sentiment</Label>
                      <Select value={form.sentimentStatus} onValueChange={(v) => setForm({ ...form, sentimentStatus: v as ClientData["sentimentStatus"] })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sentimentOptions.map((s) => (
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
                  <div className="space-y-2">
                    <Label>Decided Commercials</Label>
                    <Input value={form.decidedCommercials} onChange={(e) => setForm({ ...form, decidedCommercials: e.target.value })} />
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
                    <p className="text-xs text-muted-foreground">Sentiment</p>
                    <Badge className={`mt-1 ${sentimentOptions.find((s) => s.value === client.sentimentStatus)?.color || ""}`} variant="secondary">
                      {sentimentOptions.find((s) => s.value === client.sentimentStatus)?.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Monthly Billing</p>
                    <p className="mt-1 text-sm font-medium">{client.avgBillingAmount ? fmt(client.avgBillingAmount) : "\u2014"}</p>
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
                          </td>
                        </AnimatedRow>
                      ))}
                    </AnimatedTableBody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
                    <div key={p.id} className="flex items-center justify-between rounded-md border p-2">
                      <span className="text-sm">{p.name}</span>
                      <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
