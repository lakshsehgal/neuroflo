"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient, deleteClient, updateClient } from "@/actions/clients";
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
import { Separator } from "@/components/ui/separator";
import {
  PageTransition,
  AnimatedTableBody,
  AnimatedRow,
  AnimatedNumber,
} from "@/components/motion";
import { formatDate } from "@/lib/utils";
import {
  Plus,
  IndianRupee,
  TrendingUp,
  Bell,
  Smile,
  Meh,
  AlertTriangle,
  XCircle,
  Trash2,
} from "lucide-react";

const sentimentConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  HAPPY: { label: "Happy", color: "bg-green-100 text-green-800", icon: <Smile className="h-3.5 w-3.5" /> },
  NEUTRAL: { label: "Neutral", color: "bg-gray-100 text-gray-800", icon: <Meh className="h-3.5 w-3.5" /> },
  AT_RISK: { label: "At Risk", color: "bg-orange-100 text-orange-800", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  CHURNED: { label: "Churned", color: "bg-red-100 text-red-800", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const invoiceStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  SENT: "bg-blue-100 text-blue-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  CANCELLED: "bg-gray-100 text-gray-800",
};

const clientStatusConfig: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-800" },
  CHURNED: { label: "Churned", color: "bg-red-100 text-red-800" },
};

type ClientData = {
  id: string;
  name: string;
  industry: string | null;
  contactName: string | null;
  contactEmail: string | null;
  sow: string | null;
  status: string;
  sentimentStatus: string;
  avgBillingAmount: number | null;
  decidedCommercials: string | null;
  invoicingDueDay: number | null;
  reminderDaysBefore: number;
  _count: { projects: number; invoices: number };
  invoices: { id: string; dueDate: Date; status: string; amount: number }[];
};

type ReminderData = {
  id: string;
  amount: number;
  dueDate: Date;
  status: string;
  client: { name: string; reminderDaysBefore: number };
};

interface Props {
  clients: ClientData[];
  reminders: ReminderData[];
  thisMonthRevenue: number;
  nextMonthRevenue: number;
}

export function ClientsManagement({ clients, reminders, thisMonthRevenue, nextMonthRevenue }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [form, setForm] = useState({
    name: "", industry: "", contactName: "", contactEmail: "", contactPhone: "",
    website: "", notes: "", sow: "", status: "ACTIVE", sentimentStatus: "NEUTRAL",
    avgBillingAmount: "", decidedCommercials: "", invoicingDueDay: "", reminderDaysBefore: "3",
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await createClient({
        name: form.name,
        industry: form.industry || undefined,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        contactPhone: form.contactPhone || undefined,
        website: form.website || undefined,
        notes: form.notes || undefined,
        sow: form.sow || undefined,
        status: form.status as "ACTIVE" | "CHURNED",
        sentimentStatus: form.sentimentStatus as "HAPPY" | "NEUTRAL" | "AT_RISK" | "CHURNED",
        avgBillingAmount: form.avgBillingAmount ? parseFloat(form.avgBillingAmount) : null,
        decidedCommercials: form.decidedCommercials || undefined,
        invoicingDueDay: form.invoicingDueDay ? parseInt(form.invoicingDueDay) : null,
        reminderDaysBefore: parseInt(form.reminderDaysBefore) || 3,
      });
      if (result.success) {
        setDialogOpen(false);
        setForm({
          name: "", industry: "", contactName: "", contactEmail: "", contactPhone: "",
          website: "", notes: "", sow: "", status: "ACTIVE", sentimentStatus: "NEUTRAL",
          avgBillingAmount: "", decidedCommercials: "", invoicingDueDay: "", reminderDaysBefore: "3",
        });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this client and all associated data?")) return;
    startTransition(async () => {
      await deleteClient(id);
    });
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Management</h1>
            <p className="text-muted-foreground">Manage clients, billing, and invoicing</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Client</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Client</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Client Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Industry</Label>
                    <Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Name</Label>
                    <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>SOW (Scope of Work)</Label>
                  <Textarea value={form.sow} onChange={(e) => setForm({ ...form, sow: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Client Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="CHURNED">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sentiment</Label>
                    <Select value={form.sentimentStatus} onValueChange={(v) => setForm({ ...form, sentimentStatus: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HAPPY">Happy</SelectItem>
                        <SelectItem value="NEUTRAL">Neutral</SelectItem>
                        <SelectItem value="AT_RISK">At Risk</SelectItem>
                        <SelectItem value="CHURNED">Churned</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Avg Monthly Billing</Label>
                  <Input type="number" value={form.avgBillingAmount} onChange={(e) => setForm({ ...form, avgBillingAmount: e.target.value })} placeholder="Amount in INR" />
                </div>
                <div className="space-y-2">
                  <Label>Decided Commercials</Label>
                  <Input value={form.decidedCommercials} onChange={(e) => setForm({ ...form, decidedCommercials: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Invoice Due Day (1-28)</Label>
                    <Input type="number" min={1} max={28} value={form.invoicingDueDay} onChange={(e) => setForm({ ...form, invoicingDueDay: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Reminder Days Before</Label>
                    <Input type="number" value={form.reminderDaysBefore} onChange={(e) => setForm({ ...form, reminderDaysBefore: e.target.value })} />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creating..." : "Create Client"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Revenue Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
                <p className="text-xs font-medium text-muted-foreground">This Month (Est.)</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{fmt(thisMonthRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <p className="text-xs font-medium text-muted-foreground">Next Month (Est.)</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{fmt(nextMonthRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-xs font-medium text-muted-foreground">Active Clients</p>
              <p className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={clients.filter((c) => c.sentimentStatus !== "CHURNED").length} />
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-600" />
                <p className="text-xs font-medium text-muted-foreground">Upcoming Invoices</p>
              </div>
              <p className="mt-2 text-2xl font-bold">
                <AnimatedNumber value={reminders.length} />
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Invoice Reminders */}
        {reminders.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4 text-orange-500" />Invoice Reminders</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {reminders.slice(0, 5).map((r) => {
                  const daysUntil = Math.ceil((new Date(r.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={r.id} className="flex items-center justify-between rounded-md border p-2.5">
                      <div>
                        <p className="text-sm font-medium">{r.client.name}</p>
                        <p className="text-xs text-muted-foreground">Due {formatDate(r.dueDate)} ({daysUntil}d away)</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(r.amount)}</p>
                        <Badge className={`${invoiceStatusColors[r.status]} text-[10px]`} variant="secondary">{r.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Table */}
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium">Client</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Status</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Sentiment</th>
                <th className="px-3 py-3 text-left text-xs font-medium">SOW</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Avg Billing</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Commercials</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Invoice Due</th>
                <th className="px-3 py-3 text-left text-xs font-medium">Next Invoice</th>
                <th className="px-3 py-3 text-left text-xs font-medium w-10"></th>
              </tr>
            </thead>
            <AnimatedTableBody>
              {clients.map((client) => {
                const sentiment = sentimentConfig[client.sentimentStatus] || sentimentConfig.NEUTRAL;
                const nextInvoice = client.invoices[0];
                return (
                  <AnimatedRow key={client.id} className="border-b hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/admin/clients/${client.id}`)}>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{client.name}</p>
                      {client.contactName && <p className="text-[10px] text-muted-foreground">{client.contactName}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={`${clientStatusConfig[client.status]?.color || ""} text-[10px]`} variant="secondary">
                        {clientStatusConfig[client.status]?.label || client.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge className={`${sentiment.color} text-[10px] gap-1`} variant="secondary">
                        {sentiment.icon}{sentiment.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground max-w-[150px] truncate">{client.sow || "—"}</td>
                    <td className="px-3 py-3 text-sm font-medium">{client.avgBillingAmount ? fmt(client.avgBillingAmount) : "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{client.decidedCommercials || "—"}</td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">{client.invoicingDueDay ? `Day ${client.invoicingDueDay}` : "—"}</td>
                    <td className="px-3 py-3">
                      {nextInvoice ? (
                        <div>
                          <Badge className={`${invoiceStatusColors[nextInvoice.status]} text-[10px]`} variant="secondary">{nextInvoice.status}</Badge>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(nextInvoice.dueDate)}</p>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-3 py-3">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </AnimatedRow>
                );
              })}
            </AnimatedTableBody>
          </table>
        </div>
      </div>
    </PageTransition>
  );
}
