"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronRight,
  Users,
  CircleDot,
  Smile,
  Meh,
  Frown,
  XCircle,
  Shield,
} from "lucide-react";

type OwnerInfo = {
  id: string;
  name: string;
  departmentId: string | null;
  department: { id: string; name: string } | null;
} | null;

type DashboardClient = {
  id: string;
  name: string;
  mandates: string[];
  industry: string | null;
  sentimentStatus: string;
  avgBillingAmount: number | null;
  oneTimeProjectAmount: number | null;
  createdAt: string | Date;
  primaryPerformanceOwner: OwnerInfo;
  secondaryPerformanceOwner: OwnerInfo;
  creativeStrategyOwner: OwnerInfo;
};

type Props = {
  data: {
    clients: DashboardClient[];
    departments: { id: string; name: string }[];
    teams: {
      id: string;
      name: string;
      departmentId: string;
      department: { id: string; name: string };
    }[];
    teamMembers: {
      userId: string;
      role: string;
      team: {
        id: string;
        name: string;
        departmentId: string;
        department: { id: string; name: string };
      };
    }[];
  };
};

type CreativeUserBandwidth = {
  id: string;
  name: string;
  clients: { name: string; sentiment: string; mandates: string[] }[];
  mandateBreakdown: Record<string, number>;
  atRiskCount: number;
  happyCount: number;
  teamNames: string[];
};

const SENTIMENT_CONFIG: Record<string, { icon: typeof Smile; color: string; label: string; bgColor: string }> = {
  HAPPY: { icon: Smile, color: "text-green-600", label: "Happy", bgColor: "bg-green-500" },
  NEUTRAL: { icon: Meh, color: "text-slate-500", label: "Neutral", bgColor: "bg-slate-400" },
  AT_RISK: { icon: Frown, color: "text-amber-600", label: "At Risk", bgColor: "bg-amber-500" },
  CHURNED: { icon: XCircle, color: "text-red-600", label: "Churned", bgColor: "bg-red-500" },
};

const MANDATE_COLORS: Record<string, string> = {
  "Meta Ads": "bg-blue-50 text-blue-700 border-blue-200",
  "Google Ads": "bg-green-50 text-green-700 border-green-200",
  "Post-Production": "bg-purple-50 text-purple-700 border-purple-200",
  "UGCs": "bg-amber-50 text-amber-700 border-amber-200",
  "Whatsapp Marketing": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "CRO": "bg-red-50 text-red-700 border-red-200",
  "Statics Only": "bg-slate-50 text-slate-700 border-slate-200",
};

function SentimentIcon({ status }: { status: string }) {
  const config = SENTIMENT_CONFIG[status] || SENTIMENT_CONFIG.NEUTRAL;
  const Icon = config.icon;
  return <Icon className={`h-3.5 w-3.5 ${config.color}`} />;
}

export function CreativeDashboard({ data }: Props) {
  const { clients, teamMembers } = data;
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const toggleUser = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Build user → teams lookup
  const userTeamsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const tm of teamMembers) {
      const existing = map.get(tm.userId) || [];
      existing.push(tm.team.name);
      map.set(tm.userId, existing);
    }
    return map;
  }, [teamMembers]);

  // Build per-user bandwidth for creative owners
  const userBandwidth = useMemo(() => {
    const map = new Map<string, CreativeUserBandwidth>();

    for (const client of clients) {
      if (!client.creativeStrategyOwner) continue;
      const owner = client.creativeStrategyOwner;

      if (!map.has(owner.id)) {
        map.set(owner.id, {
          id: owner.id,
          name: owner.name,
          clients: [],
          mandateBreakdown: {},
          atRiskCount: 0,
          happyCount: 0,
          teamNames: userTeamsMap.get(owner.id) || [],
        });
      }

      const user = map.get(owner.id)!;
      user.clients.push({
        name: client.name,
        sentiment: client.sentimentStatus,
        mandates: client.mandates,
      });
      if (client.sentimentStatus === "AT_RISK") user.atRiskCount++;
      if (client.sentimentStatus === "HAPPY") user.happyCount++;

      for (const mandate of client.mandates) {
        user.mandateBreakdown[mandate] = (user.mandateBreakdown[mandate] || 0) + 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.clients.length - a.clients.length);
  }, [clients, userTeamsMap]);

  // Mandate distribution across creative-owned clients
  const mandateDistribution = useMemo(() => {
    const map = new Map<string, { count: number; clientNames: string[] }>();
    for (const client of clients) {
      if (!client.creativeStrategyOwner) continue;
      for (const mandate of client.mandates) {
        const existing = map.get(mandate) || { count: 0, clientNames: [] };
        existing.count++;
        existing.clientNames.push(client.name);
        map.set(mandate, existing);
      }
    }
    return Array.from(map.entries())
      .map(([mandate, d]) => ({ mandate, ...d }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Sentiment breakdown
  const sentimentBreakdown = useMemo(() => {
    const map: Record<string, number> = { HAPPY: 0, NEUTRAL: 0, AT_RISK: 0 };
    for (const client of clients) {
      if (client.sentimentStatus in map) map[client.sentimentStatus]++;
    }
    return map;
  }, [clients]);

  // Owner-to-mandate matrix: which creative owner handles which mandate types
  const ownerMandateMatrix = useMemo(() => {
    const allMandates = new Set<string>();
    for (const user of userBandwidth) {
      for (const mandate of Object.keys(user.mandateBreakdown)) {
        allMandates.add(mandate);
      }
    }
    return Array.from(allMandates).sort();
  }, [userBandwidth]);

  // Industry distribution for creative-owned clients
  const industryDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) {
      if (!c.creativeStrategyOwner) continue;
      const industry = c.industry || "Not specified";
      map.set(industry, (map.get(industry) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Stats
  const totalActiveClients = clients.length;
  const clientsWithCreativeOwner = clients.filter((c) => c.creativeStrategyOwner).length;
  const unassignedClients = clients.filter((c) => !c.creativeStrategyOwner);
  const atRiskClients = clients.filter((c) => c.sentimentStatus === "AT_RISK" && c.creativeStrategyOwner);
  const maxLoad = Math.max(...userBandwidth.map((u) => u.clients.length), 1);
  const avgLoad = userBandwidth.length > 0
    ? (userBandwidth.reduce((sum, u) => sum + u.clients.length, 0) / userBandwidth.length).toFixed(1)
    : "0";
  const coveragePercent = totalActiveClients > 0
    ? Math.round((clientsWithCreativeOwner / totalActiveClients) * 100)
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-pink-100">
                <Palette className="h-5 w-5 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalActiveClients}</p>
                <p className="text-xs text-muted-foreground">Active Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{coveragePercent}%</p>
                <p className="text-xs text-muted-foreground">Creative Coverage</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userBandwidth.length}</p>
                <p className="text-xs text-muted-foreground">Creative Owners</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgLoad}</p>
                <p className="text-xs text-muted-foreground">Avg Load/Person</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unassignedClients.length}</p>
                <p className="text-xs text-muted-foreground">Unassigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health + Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Client Health */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Client Health Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(["HAPPY", "NEUTRAL", "AT_RISK"] as const).map((status) => {
                const count = sentimentBreakdown[status] || 0;
                const pct = totalActiveClients > 0 ? (count / totalActiveClients) * 100 : 0;
                const config = SENTIMENT_CONFIG[status];
                const Icon = config.icon;
                return (
                  <div key={status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        <span className="font-medium">{config.label}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {count} ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${config.bgColor} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <div className="space-y-4">
          {unassignedClients.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  {unassignedClients.length} Without Creative Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {unassignedClients.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {atRiskClients.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-800">
                  <Frown className="h-4 w-4" />
                  {atRiskClients.length} At-Risk with Creative Owner
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {atRiskClients.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[10px] text-red-700 border-red-300">
                      {c.name} → {c.creativeStrategyOwner!.name}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Creative Owner Bandwidth — expandable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Creative Owner Bandwidth
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Click any owner to see their full client portfolio with sentiment &amp; mandate breakdown
          </p>
        </CardHeader>
        <CardContent>
          {userBandwidth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No creative owners assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {userBandwidth.map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                const isOverloaded = user.clients.length > (parseFloat(avgLoad) || 0) + 2;
                return (
                  <div key={user.id} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleUser(user.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="h-8 w-8 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-pink-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{user.name}</span>
                          {user.teamNames.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {user.teamNames.join(", ")}
                            </span>
                          )}
                          {isOverloaded && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                              High Load
                            </Badge>
                          )}
                          {user.atRiskCount > 0 && (
                            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200">
                              {user.atRiskCount} at risk
                            </Badge>
                          )}
                        </div>
                        {/* Bar */}
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted/50 mt-1.5">
                          <div
                            className="bg-pink-500 transition-all"
                            style={{ width: `${(user.clients.length / maxLoad) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-sm">{user.clients.length}</span>
                        <p className="text-[10px] text-muted-foreground">
                          {Object.keys(user.mandateBreakdown).length} mandate type{Object.keys(user.mandateBreakdown).length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                        {/* Mandate breakdown for this user */}
                        {Object.keys(user.mandateBreakdown).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-2 border-b">
                            <span className="text-[10px] text-muted-foreground mr-1">Mandates handled:</span>
                            {Object.entries(user.mandateBreakdown)
                              .sort((a, b) => b[1] - a[1])
                              .map(([mandate, count]) => (
                                <Badge
                                  key={mandate}
                                  variant="secondary"
                                  className={`text-[9px] px-1.5 py-0 ${MANDATE_COLORS[mandate] || ""}`}
                                >
                                  {mandate} ({count})
                                </Badge>
                              ))}
                          </div>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Client</th>
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Sentiment</th>
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Mandates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {user.clients.map((c) => (
                                <tr key={c.name} className="border-b last:border-0">
                                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center gap-1">
                                      <SentimentIcon status={c.sentiment} />
                                      <span className={SENTIMENT_CONFIG[c.sentiment]?.color || ""}>
                                        {SENTIMENT_CONFIG[c.sentiment]?.label || c.sentiment}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex flex-wrap gap-0.5">
                                      {c.mandates.map((m) => (
                                        <Badge key={m} variant="secondary" className={`text-[8px] px-1 py-0 ${MANDATE_COLORS[m] || ""}`}>
                                          {m}
                                        </Badge>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Owner × Mandate Matrix */}
      {userBandwidth.length > 0 && ownerMandateMatrix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Owner × Mandate Matrix
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              How mandate types are distributed across creative owners
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground sticky left-0 bg-muted/30">Owner</th>
                    {ownerMandateMatrix.map((mandate) => (
                      <th key={mandate} className="px-2 py-2 text-center font-medium text-muted-foreground">
                        <Badge variant="secondary" className={`text-[8px] px-1 py-0 ${MANDATE_COLORS[mandate] || ""}`}>
                          {mandate}
                        </Badge>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {userBandwidth.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="px-3 py-2 font-medium sticky left-0 bg-background">{user.name}</td>
                      {ownerMandateMatrix.map((mandate) => {
                        const count = user.mandateBreakdown[mandate] || 0;
                        return (
                          <td key={mandate} className="px-2 py-2 text-center">
                            {count > 0 ? (
                              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pink-100 text-pink-700 text-[10px] font-semibold">
                                {count}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right font-semibold">{user.clients.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mandate + Industry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mandate Coverage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              Mandate Coverage
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Mandate types across clients with creative owners
            </p>
          </CardHeader>
          <CardContent>
            {mandateDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No mandate data</p>
            ) : (
              <div className="space-y-2.5">
                {mandateDistribution.map(({ mandate, count }) => {
                  const maxCount = mandateDistribution[0]?.count || 1;
                  return (
                    <div key={mandate} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-2 py-0.5 ${MANDATE_COLORS[mandate] || ""}`}
                        >
                          {mandate}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {count} client{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pink-400 transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Industry Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Industry Breakdown
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Client industries handled by creative owners
            </p>
          </CardHeader>
          <CardContent>
            {industryDistribution.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No data</p>
            ) : (
              <div className="space-y-2.5">
                {industryDistribution.map(({ industry, count }) => {
                  const maxCount = industryDistribution[0]?.count || 1;
                  return (
                    <div key={industry} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{industry}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {count} client{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-fuchsia-400 transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-pink-500" />
          Creative Owner
        </div>
        <div className="flex items-center gap-1.5">
          <Smile className="h-3 w-3 text-green-600" />
          Happy
        </div>
        <div className="flex items-center gap-1.5">
          <Meh className="h-3 w-3 text-slate-500" />
          Neutral
        </div>
        <div className="flex items-center gap-1.5">
          <Frown className="h-3 w-3 text-amber-600" />
          At Risk
        </div>
      </div>
    </div>
  );
}
