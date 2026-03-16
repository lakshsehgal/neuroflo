"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  PageTransition,
  StaggerContainer,
  StaggerItem,
  FadeIn,
  AnimatedNumber,
} from "@/components/motion";
import {
  AreaChart,
  Area,
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
} from "recharts";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  PieChart as PieChartIcon,
  AlertTriangle,
  Plus,
  Trash2,
  Building2,
  Users,
  Briefcase,
  Monitor,
  MoreHorizontal,
} from "lucide-react";
import { createExpense, deleteExpense } from "@/actions/founders";

// ─── Types ──────────────────────────────────────────────

interface ExpenseItem {
  id: string;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  notes: string | null;
}

interface FounderData {
  expenses: {
    totalMonthly: number;
    totalOneTime: number;
    byCategory: Record<string, number>;
    items: ExpenseItem[];
  };
  revenue: {
    totalCollected: number;
    pending: number;
    overdue: number;
    expectedMonthly: number;
  };
  monthlyTrend: { month: string; revenue: number; expenses: number; profit: number }[];
  clientRevenue: { name: string; revenue: number; percentage: number }[];
  clients: { id: string; name: string; avgBillingAmount: number | null; sentimentStatus: string }[];
  profitEstimate: {
    monthlyRevenue: number;
    monthlyExpenses: number;
    monthlyProfit: number;
    margin: number;
  };
}

interface FounderDashboardProps {
  data: FounderData;
  expenses: ExpenseItem[];
}

// ─── Helpers ────────────────────────────────────────────

function formatCurrency(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString("en-IN");
}

function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  SALARIES: "#6366f1",
  TOOLS: "#3b82f6",
  OFFICE: "#f59e0b",
  MARKETING: "#10b981",
  OTHER: "#8b5cf6",
};

const CATEGORY_ICONS: Record<string, typeof Users> = {
  SALARIES: Users,
  TOOLS: Monitor,
  OFFICE: Building2,
  MARKETING: Briefcase,
  OTHER: MoreHorizontal,
};

const CATEGORY_LABELS: Record<string, string> = {
  SALARIES: "Salaries",
  TOOLS: "Tools & Software",
  OFFICE: "Office & Overheads",
  MARKETING: "Marketing",
  OTHER: "Other",
};

const FREQUENCY_LABELS: Record<string, string> = {
  MONTHLY: "/mo",
  QUARTERLY: "/qtr",
  YEARLY: "/yr",
  ONE_TIME: "one-time",
};

// ─── Component ──────────────────────────────────────────

export function FounderDashboard({ data, expenses }: FounderDashboardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Add expense form
  const [expName, setExpName] = useState("");
  const [expCategory, setExpCategory] = useState<string>("SALARIES");
  const [expAmount, setExpAmount] = useState("");
  const [expFrequency, setExpFrequency] = useState<string>("MONTHLY");
  const [expNotes, setExpNotes] = useState("");

  function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (!expName || isNaN(amount) || amount <= 0) return;

    startTransition(async () => {
      await createExpense({
        name: expName,
        category: expCategory as "SALARIES" | "TOOLS" | "OFFICE" | "MARKETING" | "OTHER",
        amount,
        frequency: expFrequency as "MONTHLY" | "QUARTERLY" | "YEARLY" | "ONE_TIME",
        notes: expNotes || undefined,
      });
      setExpName("");
      setExpAmount("");
      setExpNotes("");
      setDialogOpen(false);
    });
  }

  function handleDeleteExpense(id: string) {
    if (!confirm("Remove this expense?")) return;
    startTransition(async () => {
      await deleteExpense(id);
    });
  }

  const { profitEstimate, revenue, monthlyTrend, clientRevenue } = data;
  const isProfit = profitEstimate.monthlyProfit >= 0;

  // Expense pie data
  const expensePieData = Object.entries(data.expenses.byCategory).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value: Math.round(value),
    color: CATEGORY_COLORS[key] || "#94a3b8",
  }));

  // Client dependency risk
  const topClient = clientRevenue[0];
  const top3Revenue = clientRevenue.slice(0, 3).reduce((s, c) => s + c.revenue, 0);
  const top3Percentage = revenue.totalCollected > 0
    ? (top3Revenue / revenue.totalCollected) * 100
    : 0;
  const isDependencyRisk = topClient && topClient.percentage > 30;

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Founder&apos;s Hub</h1>
              <p className="text-sm text-muted-foreground">Financial overview & business insights</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={expName} onChange={(e) => setExpName(e.target.value)} placeholder="e.g. Designer Salary, Figma, Office Rent" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expCategory} onValueChange={setExpCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SALARIES">Salaries</SelectItem>
                        <SelectItem value="TOOLS">Tools & Software</SelectItem>
                        <SelectItem value="OFFICE">Office & Overheads</SelectItem>
                        <SelectItem value="MARKETING">Marketing</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={expFrequency} onValueChange={setExpFrequency}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                        <SelectItem value="YEARLY">Yearly</SelectItem>
                        <SelectItem value="ONE_TIME">One-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="50000" min="1" step="any" required />
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Input value={expNotes} onChange={(e) => setExpNotes(e.target.value)} placeholder="Any additional details..." />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Adding..." : "Add Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* ─── Profit Snapshot Cards ─── */}
        <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StaggerItem>
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Expected Monthly Revenue</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-600">
                      ₹<AnimatedNumber value={Math.round(profitEstimate.monthlyRevenue)} />
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-l-4 border-l-red-400">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Monthly Expenses</p>
                    <p className="mt-1 text-2xl font-bold text-red-500">
                      ₹<AnimatedNumber value={Math.round(data.expenses.totalMonthly)} />
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                    <Wallet className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className={`border-l-4 ${isProfit ? "border-l-blue-500" : "border-l-orange-500"}`}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Est. Monthly Profit</p>
                    <p className={`mt-1 text-2xl font-bold ${isProfit ? "text-blue-600" : "text-orange-500"}`}>
                      {profitEstimate.monthlyProfit < 0 ? "-" : ""}₹<AnimatedNumber value={Math.abs(Math.round(profitEstimate.monthlyProfit))} />
                    </p>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isProfit ? "bg-blue-100" : "bg-orange-100"}`}>
                    {isProfit ? <TrendingUp className="h-5 w-5 text-blue-600" /> : <TrendingDown className="h-5 w-5 text-orange-500" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className="border-l-4 border-l-violet-500">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Profit Margin</p>
                    <p className="mt-1 text-2xl font-bold text-violet-600">
                      <AnimatedNumber value={Math.round(profitEstimate.margin)} />%
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100">
                    <PieChartIcon className="h-5 w-5 text-violet-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </StaggerContainer>

        {/* ─── Revenue vs Expenses Trend ─── */}
        <FadeIn delay={0.15}>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Revenue vs Expenses (12 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${formatCurrency(v)}`} />
                    <Tooltip
                      formatter={(value, name) => [formatINR(Number(value)), name === "revenue" ? "Revenue" : name === "expenses" ? "Expenses" : "Profit"]}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} name="revenue" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="#ef4444" fillOpacity={0.08} strokeWidth={2} strokeDasharray="6 3" name="expenses" />
                    <Area type="monotone" dataKey="profit" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} strokeWidth={2} name="profit" />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ─── Client Revenue Concentration ─── */}
          <FadeIn delay={0.2}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Client Revenue Share</CardTitle>
                  {isDependencyRisk && (
                    <Badge variant="destructive" className="gap-1 text-[10px]">
                      <AlertTriangle className="h-3 w-3" />
                      High Dependency
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {clientRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No paid invoices yet</p>
                ) : (
                  <div className="space-y-3">
                    {clientRevenue.slice(0, 8).map((client, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium truncate max-w-[200px]">{client.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{formatINR(client.revenue)}</span>
                            <Badge variant={client.percentage > 30 ? "destructive" : "secondary"} className="text-[10px] min-w-[40px] justify-center">
                              {client.percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100">
                          <div
                            className={`h-full rounded-full transition-all ${
                              client.percentage > 30 ? "bg-red-400" : client.percentage > 15 ? "bg-amber-400" : "bg-emerald-400"
                            }`}
                            style={{ width: `${Math.min(client.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {top3Percentage > 0 && (
                      <div className="mt-4 rounded-lg border p-3 bg-muted/30">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">Top 3 clients</span> account for{" "}
                          <span className={`font-bold ${top3Percentage > 60 ? "text-red-500" : "text-emerald-600"}`}>
                            {top3Percentage.toFixed(0)}%
                          </span>{" "}
                          of total revenue
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* ─── Expense Breakdown Pie ─── */}
          <FadeIn delay={0.25}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Expense Breakdown (Monthly)</CardTitle>
              </CardHeader>
              <CardContent>
                {expensePieData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                    <Wallet className="mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">No expenses added yet</p>
                    <p className="text-xs">Click &quot;Add Expense&quot; to get started</p>
                  </div>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ₹${formatCurrency(value)}`}
                        >
                          {expensePieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatINR(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ─── Revenue Summary ─── */}
          <FadeIn delay={0.3}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Revenue Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Collected (12 mo)</p>
                      <p className="text-xl font-bold text-emerald-600">{formatINR(revenue.totalCollected)}</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Paid</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Invoices</p>
                      <p className="text-xl font-bold text-amber-500">{formatINR(revenue.pending)}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue Invoices</p>
                      <p className="text-xl font-bold text-red-500">{formatINR(revenue.overdue)}</p>
                    </div>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>
                  </div>
                  <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-4">
                    <p className="text-xs text-muted-foreground uppercase font-medium">Monthly Run Rate</p>
                    <p className="text-lg font-bold text-indigo-600">
                      {formatINR(revenue.totalCollected / 12)} <span className="text-xs font-normal text-muted-foreground">avg/month</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>

          {/* ─── Top Paying Clients Bar Chart ─── */}
          <FadeIn delay={0.35}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Top Paying Clients</CardTitle>
              </CardHeader>
              <CardContent>
                {clientRevenue.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No data yet</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={clientRevenue.slice(0, 6)}
                        layout="vertical"
                        margin={{ left: 10, right: 10 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${formatCurrency(v)}`} />
                        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(value) => formatINR(Number(value))} />
                        <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* ─── Expense Items List ─── */}
        <FadeIn delay={0.4}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">All Expenses</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {expenses.length} items &middot; {formatINR(data.expenses.totalMonthly)}/month
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No expenses yet. Add your first expense to see insights.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.map((exp) => {
                    const Icon = CATEGORY_ICONS[exp.category] || MoreHorizontal;
                    const color = CATEGORY_COLORS[exp.category] || "#94a3b8";
                    return (
                      <div key={exp.id} className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ backgroundColor: `${color}20` }}
                          >
                            <Icon className="h-4 w-4" style={{ color }} />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{exp.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {CATEGORY_LABELS[exp.category]} {exp.notes && `· ${exp.notes}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{formatINR(exp.amount)}</p>
                            <p className="text-[10px] text-muted-foreground">{FREQUENCY_LABELS[exp.frequency]}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteExpense(exp.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
