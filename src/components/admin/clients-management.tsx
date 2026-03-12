"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient, deleteClient, updateClientField } from "@/actions/clients";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  Settings2,
  Users,
  BarChart3,
  PieChart as PieChartIcon,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";

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

const CHART_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
];

// Column definitions
const ALL_COLUMNS = [
  { key: "client", label: "Client", required: true },
  { key: "status", label: "Status", required: false },
  { key: "sentiment", label: "Sentiment", required: false },
  { key: "sow", label: "SOW", required: false },
  { key: "avgBilling", label: "Avg Billing", required: false },
  { key: "oneTimeProject", label: "One-Time Project", required: false },
  { key: "commercials", label: "Commercials", required: false },
  { key: "invoiceDue", label: "Invoice Due", required: false },
  { key: "nextInvoice", label: "Next Invoice", required: false },
  { key: "actions", label: "", required: true },
];

const DEFAULT_VISIBLE = ["client", "status", "sentiment", "avgBilling", "oneTimeProject", "commercials", "invoiceDue", "nextInvoice", "actions"];

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
  oneTimeProjectAmount: number | null;
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

type DashboardInvoice = {
  id: string;
  amount: number;
  status: string;
  dueDate: Date;
  paidDate: Date | null;
  clientId: string;
  client: { name: string };
};

type DashboardClient = {
  id: string;
  name: string;
  status: string;
  sentimentStatus: string;
  avgBillingAmount: number | null;
  oneTimeProjectAmount: number | null;
  _count: { invoices: number; projects: number };
};

interface Props {
  clients: ClientData[];
  reminders: ReminderData[];
  thisMonthRevenue: number;
  nextMonthRevenue: number;
  dashboardData: { allInvoices: DashboardInvoice[]; clients: DashboardClient[] };
}

export function ClientsManagement({ clients: initialClients, reminders, thisMonthRevenue, nextMonthRevenue, dashboardData }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"clients" | "dashboard">("clients");
  const [clients, setClients] = useState(initialClients);

  // Column visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neuroflo-client-columns");
      if (saved) return JSON.parse(saved);
    }
    return DEFAULT_VISIBLE;
  });

  useEffect(() => {
    localStorage.setItem("neuroflo-client-columns", JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Form state
  const [form, setForm] = useState({
    name: "", industry: "", contactName: "", contactEmail: "", contactPhone: "",
    website: "", notes: "", sow: "", status: "ACTIVE", sentimentStatus: "NEUTRAL",
    avgBillingAmount: "", oneTimeProjectAmount: "", decidedCommercials: "",
    invoicingDueDay: "", reminderDaysBefore: "3",
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
        oneTimeProjectAmount: form.oneTimeProjectAmount ? parseFloat(form.oneTimeProjectAmount) : null,
        decidedCommercials: form.decidedCommercials || undefined,
        invoicingDueDay: form.invoicingDueDay ? parseInt(form.invoicingDueDay) : null,
        reminderDaysBefore: parseInt(form.reminderDaysBefore) || 3,
      });
      if (result.success) {
        setDialogOpen(false);
        setForm({
          name: "", industry: "", contactName: "", contactEmail: "", contactPhone: "",
          website: "", notes: "", sow: "", status: "ACTIVE", sentimentStatus: "NEUTRAL",
          avgBillingAmount: "", oneTimeProjectAmount: "", decidedCommercials: "",
          invoicingDueDay: "", reminderDaysBefore: "3",
        });
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this client and all associated data?")) return;
    startTransition(async () => {
      await deleteClient(id);
      setClients((prev) => prev.filter((c) => c.id !== id));
    });
  }

  const handleInlineUpdate = useCallback((clientId: string, field: string, value: string | number | null) => {
    // Optimistic update
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== clientId) return c;
        return { ...c, [field]: value };
      })
    );
    // Persist
    startTransition(async () => {
      await updateClientField(clientId, field, value);
    });
  }, []);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

  const isColVisible = (key: string) => visibleColumns.includes(key);

  return (
    <PageTransition>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Client Management</h1>
            <p className="text-muted-foreground">Manage clients, billing, and invoicing</p>
          </div>
          <div className="flex items-center gap-2">
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Avg Monthly Billing</Label>
                      <Input type="number" value={form.avgBillingAmount} onChange={(e) => setForm({ ...form, avgBillingAmount: e.target.value })} placeholder="INR" />
                    </div>
                    <div className="space-y-2">
                      <Label>One-Time Project Amt</Label>
                      <Input type="number" value={form.oneTimeProjectAmount} onChange={(e) => setForm({ ...form, oneTimeProjectAmount: e.target.value })} placeholder="INR" />
                    </div>
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
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-muted/30 p-0.5">
            <button
              onClick={() => setActiveTab("clients")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === "clients" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users className="h-3.5 w-3.5" />
              Clients
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${activeTab === "dashboard" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
            </button>
          </div>
        </div>

        {activeTab === "clients" ? (
          <ClientsTab
            clients={clients}
            reminders={reminders}
            thisMonthRevenue={thisMonthRevenue}
            nextMonthRevenue={nextMonthRevenue}
            fmt={fmt}
            visibleColumns={visibleColumns}
            isColVisible={isColVisible}
            toggleColumn={toggleColumn}
            handleInlineUpdate={handleInlineUpdate}
            handleDelete={handleDelete}
            router={router}
          />
        ) : (
          <DashboardTab dashboardData={dashboardData} fmt={fmt} />
        )}
      </div>
    </PageTransition>
  );
}

/* ─── Clients Tab ─── */
function ClientsTab({
  clients, reminders, thisMonthRevenue, nextMonthRevenue, fmt,
  visibleColumns, isColVisible, toggleColumn, handleInlineUpdate, handleDelete, router,
}: {
  clients: ClientData[];
  reminders: ReminderData[];
  thisMonthRevenue: number;
  nextMonthRevenue: number;
  fmt: (n: number) => string;
  visibleColumns: string[];
  isColVisible: (key: string) => boolean;
  toggleColumn: (key: string) => void;
  handleInlineUpdate: (id: string, field: string, value: string | number | null) => void;
  handleDelete: (id: string) => void;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <>
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

      {/* Client Table with column visibility toggle */}
      <div className="space-y-2">
        <div className="flex justify-end">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Settings2 className="h-3 w-3" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Toggle Columns</p>
              {ALL_COLUMNS.filter((c) => !c.required).map((col) => (
                <button
                  key={col.key}
                  onClick={() => toggleColumn(col.key)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  {isColVisible(col.key) ? (
                    <Eye className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className={isColVisible(col.key) ? "" : "text-muted-foreground"}>{col.label}</span>
                  {isColVisible(col.key) && <Check className="ml-auto h-3 w-3 text-primary" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-xs font-medium">Client</th>
                {isColVisible("status") && <th className="px-3 py-3 text-left text-xs font-medium">Status</th>}
                {isColVisible("sentiment") && <th className="px-3 py-3 text-left text-xs font-medium">Sentiment</th>}
                {isColVisible("sow") && <th className="px-3 py-3 text-left text-xs font-medium">SOW</th>}
                {isColVisible("avgBilling") && <th className="px-3 py-3 text-left text-xs font-medium">Avg Billing</th>}
                {isColVisible("oneTimeProject") && <th className="px-3 py-3 text-left text-xs font-medium">One-Time</th>}
                {isColVisible("commercials") && <th className="px-3 py-3 text-left text-xs font-medium">Commercials</th>}
                {isColVisible("invoiceDue") && <th className="px-3 py-3 text-left text-xs font-medium">Invoice Due</th>}
                {isColVisible("nextInvoice") && <th className="px-3 py-3 text-left text-xs font-medium">Next Invoice</th>}
                <th className="px-3 py-3 text-left text-xs font-medium w-10"></th>
              </tr>
            </thead>
            <AnimatedTableBody>
              {clients.map((client) => {
                const sentiment = sentimentConfig[client.sentimentStatus] || sentimentConfig.NEUTRAL;
                const nextInvoice = client.invoices[0];
                return (
                  <AnimatedRow key={client.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-2.5 cursor-pointer" onClick={() => router.push(`/admin/clients/${client.id}`)}>
                      <p className="text-sm font-medium hover:text-primary transition-colors">{client.name}</p>
                      {client.contactName && <p className="text-[10px] text-muted-foreground">{client.contactName}</p>}
                    </td>
                    {isColVisible("status") && (
                      <td className="px-3 py-2.5">
                        <Select value={client.status} onValueChange={(v) => handleInlineUpdate(client.id, "status", v)}>
                          <SelectTrigger className="h-7 w-[100px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1 focus:ring-0 focus:ring-offset-0">
                            <Badge className={`${clientStatusConfig[client.status]?.color || ""} text-[10px]`} variant="secondary">
                              {clientStatusConfig[client.status]?.label || client.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="CHURNED">Churned</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    {isColVisible("sentiment") && (
                      <td className="px-3 py-2.5">
                        <Select value={client.sentimentStatus} onValueChange={(v) => handleInlineUpdate(client.id, "sentimentStatus", v)}>
                          <SelectTrigger className="h-7 w-[110px] text-[10px] border-0 bg-transparent hover:bg-muted/40 px-1 focus:ring-0 focus:ring-offset-0">
                            <Badge className={`${sentiment.color} text-[10px] gap-1`} variant="secondary">
                              {sentiment.icon}{sentiment.label}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(sentimentConfig).map(([key, val]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-1.5">{val.icon}{val.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    )}
                    {isColVisible("sow") && (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground max-w-[150px] truncate">{client.sow || "—"}</td>
                    )}
                    {isColVisible("avgBilling") && (
                      <td className="px-3 py-2.5">
                        <InlineNumberEdit
                          value={client.avgBillingAmount}
                          onSave={(v) => handleInlineUpdate(client.id, "avgBillingAmount", v)}
                          fmt={fmt}
                        />
                      </td>
                    )}
                    {isColVisible("oneTimeProject") && (
                      <td className="px-3 py-2.5">
                        <InlineNumberEdit
                          value={client.oneTimeProjectAmount}
                          onSave={(v) => handleInlineUpdate(client.id, "oneTimeProjectAmount", v)}
                          fmt={fmt}
                        />
                      </td>
                    )}
                    {isColVisible("commercials") && (
                      <td className="px-3 py-2.5">
                        <InlineTextEdit
                          value={client.decidedCommercials}
                          onSave={(v) => handleInlineUpdate(client.id, "decidedCommercials", v || null)}
                        />
                      </td>
                    )}
                    {isColVisible("invoiceDue") && (
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{client.invoicingDueDay ? `Day ${client.invoicingDueDay}` : "—"}</td>
                    )}
                    {isColVisible("nextInvoice") && (
                      <td className="px-3 py-2.5">
                        {nextInvoice ? (
                          <div>
                            <Badge className={`${invoiceStatusColors[nextInvoice.status]} text-[10px]`} variant="secondary">{nextInvoice.status}</Badge>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(nextInvoice.dueDate)}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
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
    </>
  );
}

/* ─── Inline Editors ─── */
function InlineNumberEdit({ value, onSave, fmt }: { value: number | null; onSave: (v: number | null) => void; fmt: (n: number) => string }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value?.toString() || "");

  if (editing) {
    return (
      <Input
        type="number"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setEditing(false);
          const num = text ? parseFloat(text) : null;
          if (num !== value) onSave(num);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setText(value?.toString() || ""); setEditing(false); }
        }}
        autoFocus
        className="h-7 w-[100px] text-xs"
      />
    );
  }

  return (
    <span
      className="text-sm font-medium cursor-pointer hover:text-primary transition-colors"
      onClick={() => { setText(value?.toString() || ""); setEditing(true); }}
    >
      {value ? fmt(value) : "—"}
    </span>
  );
}

function InlineTextEdit({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || "");

  if (editing) {
    return (
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (text !== (value || "")) onSave(text || null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") { setText(value || ""); setEditing(false); }
        }}
        autoFocus
        className="h-7 w-[120px] text-xs"
      />
    );
  }

  return (
    <span
      className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
      onClick={() => { setText(value || ""); setEditing(true); }}
    >
      {value || "—"}
    </span>
  );
}

/* ─── Dashboard Tab ─── */
function DashboardTab({ dashboardData, fmt }: { dashboardData: { allInvoices: DashboardInvoice[]; clients: DashboardClient[] }; fmt: (n: number) => string }) {
  const { allInvoices, clients } = dashboardData;

  const analytics = useMemo(() => {
    // Monthly revenue trend (last 12 months)
    const monthlyRevenue: { month: string; paid: number; pending: number; overdue: number }[] = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const monthInvoices = allInvoices.filter((inv) => {
        const invDate = new Date(inv.dueDate);
        return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
      });
      monthlyRevenue.push({
        month,
        paid: monthInvoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0),
        pending: monthInvoices.filter((i) => ["PENDING", "SENT"].includes(i.status)).reduce((s, i) => s + i.amount, 0),
        overdue: monthInvoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0),
      });
    }

    // Invoice status distribution
    const statusCounts: Record<string, number> = {};
    for (const inv of allInvoices) {
      statusCounts[inv.status] = (statusCounts[inv.status] || 0) + 1;
    }
    const invoiceStatusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));

    // Client sentiment distribution
    const sentimentCounts: Record<string, number> = {};
    for (const c of clients) {
      sentimentCounts[c.sentimentStatus] = (sentimentCounts[c.sentimentStatus] || 0) + 1;
    }
    const sentimentData = Object.entries(sentimentCounts).map(([key, count]) => ({
      name: sentimentConfig[key]?.label || key,
      value: count,
    }));

    // Top clients by revenue
    const clientRevenue: Record<string, { name: string; total: number }> = {};
    for (const inv of allInvoices) {
      if (inv.status === "PAID") {
        if (!clientRevenue[inv.clientId]) {
          clientRevenue[inv.clientId] = { name: inv.client.name, total: 0 };
        }
        clientRevenue[inv.clientId].total += inv.amount;
      }
    }
    const topClients = Object.values(clientRevenue)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((c) => ({ name: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name, revenue: c.total }));

    // Summary
    const totalPaid = allInvoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
    const totalPending = allInvoices.filter((i) => ["PENDING", "SENT"].includes(i.status)).reduce((s, i) => s + i.amount, 0);
    const totalOverdue = allInvoices.filter((i) => i.status === "OVERDUE").reduce((s, i) => s + i.amount, 0);
    const activeClients = clients.filter((c) => c.status === "ACTIVE").length;
    const atRiskClients = clients.filter((c) => c.sentimentStatus === "AT_RISK").length;
    const avgRevPerClient = activeClients > 0 ? totalPaid / activeClients : 0;
    const collectionRate = (totalPaid + totalPending + totalOverdue) > 0
      ? Math.round((totalPaid / (totalPaid + totalPending + totalOverdue)) * 100)
      : 0;

    return {
      monthlyRevenue, invoiceStatusData, sentimentData, topClients,
      totalPaid, totalPending, totalOverdue, activeClients, atRiskClients,
      avgRevPerClient, collectionRate,
    };
  }, [allInvoices, clients]);

  const SENTIMENT_COLORS: Record<string, string> = {
    Happy: "#10b981",
    Neutral: "#6b7280",
    "At Risk": "#f59e0b",
    Churned: "#ef4444",
  };

  const INVOICE_STATUS_CHART_COLORS: Record<string, string> = {
    PAID: "#10b981",
    PENDING: "#f59e0b",
    SENT: "#3b82f6",
    OVERDUE: "#ef4444",
    CANCELLED: "#9ca3af",
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Collected</p>
                <p className="mt-1 text-xl font-bold text-green-600">{fmt(analytics.totalPaid)}</p>
              </div>
              <div className="rounded-full bg-green-50 p-2.5">
                <IndianRupee className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Outstanding</p>
                <p className="mt-1 text-xl font-bold text-orange-600">{fmt(analytics.totalPending + analytics.totalOverdue)}</p>
              </div>
              <div className="rounded-full bg-orange-50 p-2.5">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Collection Rate</p>
                <p className="mt-1 text-xl font-bold">{analytics.collectionRate}%</p>
              </div>
              <div className="rounded-full bg-blue-50 p-2.5">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">At Risk Clients</p>
                <p className={`mt-1 text-xl font-bold ${analytics.atRiskClients > 0 ? "text-orange-600" : ""}`}>{analytics.atRiskClients}</p>
              </div>
              <div className="rounded-full bg-orange-50 p-2.5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue trend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Revenue Trend (Last 12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={analytics.monthlyRevenue} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                formatter={(value) => [fmt(Number(value)), ""]}
              />
              <Area type="monotone" dataKey="paid" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Paid" />
              <Area type="monotone" dataKey="pending" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.4} name="Pending" />
              <Area type="monotone" dataKey="overdue" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name="Overdue" />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Top clients by revenue */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.topClients} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value) => [fmt(Number(value)), "Revenue"]} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                No paid invoices yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice status pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Invoice Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.invoiceStatusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analytics.invoiceStatusData.map((entry) => (
                    <Cell key={entry.name} fill={INVOICE_STATUS_CHART_COLORS[entry.name] || "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Client health pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Client Health</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={analytics.sentimentData}
                  cx="50%"
                  cy="45%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {analytics.sentimentData.map((entry) => (
                    <Cell key={entry.name} fill={SENTIMENT_COLORS[entry.name] || "#9ca3af"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
