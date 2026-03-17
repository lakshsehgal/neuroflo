"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  AlertTriangle,
  Shield,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Smile,
  Meh,
  Frown,
  XCircle,
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
  performanceSentiment: string;
  avgBillingAmount: number | null;
  oneTimeProjectAmount: number | null;
  createdAt: string | Date;
  primaryPerformanceOwner: OwnerInfo;
  secondaryPerformanceOwner: OwnerInfo;
  creativeStrategyOwner: OwnerInfo;
};

type TeamMemberData = {
  userId: string;
  role: string;
  team: {
    id: string;
    name: string;
    departmentId: string;
    department: { id: string; name: string };
  };
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
    teamMembers: TeamMemberData[];
  };
};

type UserBandwidth = {
  id: string;
  name: string;
  primaryClients: { name: string; sentiment: string; mandates: string[] }[];
  secondaryClients: { name: string; sentiment: string; mandates: string[] }[];
  totalClients: number;
  atRiskCount: number;
  happyCount: number;
  mandateCounts: Record<string, number>;
  teamNames: string[];
};

type TeamBreakdown = {
  teamId: string;
  teamName: string;
  deptName: string;
  members: UserBandwidth[];
  totalClients: number;
  atRiskCount: number;
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

export function PerformanceDashboard({ data }: Props) {
  const { clients, teamMembers } = data;
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleUser = (id: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTeam = (id: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Build user → teams lookup
  const userTeamsMap = useMemo(() => {
    const map = new Map<string, { teamId: string; teamName: string; deptName: string }[]>();
    for (const tm of teamMembers) {
      const existing = map.get(tm.userId) || [];
      existing.push({
        teamId: tm.team.id,
        teamName: tm.team.name,
        deptName: tm.team.department.name,
      });
      map.set(tm.userId, existing);
    }
    return map;
  }, [teamMembers]);

  // Build per-user bandwidth for performance owners
  const userBandwidth = useMemo(() => {
    const map = new Map<string, UserBandwidth>();

    const getOrCreate = (owner: NonNullable<OwnerInfo>): UserBandwidth => {
      if (!map.has(owner.id)) {
        const teams = userTeamsMap.get(owner.id) || [];
        map.set(owner.id, {
          id: owner.id,
          name: owner.name,
          primaryClients: [],
          secondaryClients: [],
          totalClients: 0,
          atRiskCount: 0,
          happyCount: 0,
          mandateCounts: {},
          teamNames: teams.map((t) => t.teamName),
        });
      }
      return map.get(owner.id)!;
    };

    for (const client of clients) {
      const clientInfo = {
        name: client.name,
        sentiment: client.performanceSentiment,
        mandates: client.mandates,
      };

      if (client.primaryPerformanceOwner) {
        const user = getOrCreate(client.primaryPerformanceOwner);
        user.primaryClients.push(clientInfo);
        user.totalClients++;
        if (client.performanceSentiment === "AT_RISK") user.atRiskCount++;
        if (client.performanceSentiment === "HAPPY") user.happyCount++;
        for (const m of client.mandates) {
          user.mandateCounts[m] = (user.mandateCounts[m] || 0) + 1;
        }
      }
      if (client.secondaryPerformanceOwner) {
        const user = getOrCreate(client.secondaryPerformanceOwner);
        user.secondaryClients.push(clientInfo);
        user.totalClients++;
        if (client.performanceSentiment === "AT_RISK") user.atRiskCount++;
        if (client.performanceSentiment === "HAPPY") user.happyCount++;
        for (const m of client.mandates) {
          user.mandateCounts[m] = (user.mandateCounts[m] || 0) + 1;
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalClients - a.totalClients);
  }, [clients, userTeamsMap]);

  // Team-specific breakdown
  const teamBreakdown = useMemo(() => {
    const performanceUserIds = new Set(userBandwidth.map((u) => u.id));
    const teamMap = new Map<string, TeamBreakdown>();

    for (const tm of teamMembers) {
      if (!performanceUserIds.has(tm.userId)) continue;
      const user = userBandwidth.find((u) => u.id === tm.userId);
      if (!user) continue;

      if (!teamMap.has(tm.team.id)) {
        teamMap.set(tm.team.id, {
          teamId: tm.team.id,
          teamName: tm.team.name,
          deptName: tm.team.department.name,
          members: [],
          totalClients: 0,
          atRiskCount: 0,
        });
      }

      const team = teamMap.get(tm.team.id)!;
      if (!team.members.find((m) => m.id === user.id)) {
        team.members.push(user);
        team.totalClients += user.totalClients;
        team.atRiskCount += user.atRiskCount;
      }
    }

    return Array.from(teamMap.values()).sort((a, b) => b.totalClients - a.totalClients);
  }, [teamMembers, userBandwidth]);

  // Mandate distribution across performance-owned clients
  const mandateDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const client of clients) {
      if (!client.primaryPerformanceOwner && !client.secondaryPerformanceOwner) continue;
      for (const mandate of client.mandates) {
        map.set(mandate, (map.get(mandate) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([mandate, count]) => ({ mandate, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Sentiment breakdown
  const sentimentBreakdown = useMemo(() => {
    const map: Record<string, number> = { HAPPY: 0, NEUTRAL: 0, AT_RISK: 0 };
    for (const client of clients) {
      if (client.performanceSentiment in map) map[client.performanceSentiment]++;
    }
    return map;
  }, [clients]);

  // Coverage overlap analysis
  const ownerOverlapInsights = useMemo(() => {
    const sameOwnerClients: string[] = [];
    const onlyPrimary: string[] = [];
    const onlySecondary: string[] = [];
    const bothAssigned: string[] = [];

    for (const c of clients) {
      const hasPrimary = !!c.primaryPerformanceOwner;
      const hasSecondary = !!c.secondaryPerformanceOwner;

      if (hasPrimary && hasSecondary) {
        bothAssigned.push(c.name);
        if (c.primaryPerformanceOwner!.id === c.secondaryPerformanceOwner!.id) {
          sameOwnerClients.push(c.name);
        }
      } else if (hasPrimary && !hasSecondary) {
        onlyPrimary.push(c.name);
      } else if (!hasPrimary && hasSecondary) {
        onlySecondary.push(c.name);
      }
    }

    return { sameOwnerClients, onlyPrimary, onlySecondary, bothAssigned };
  }, [clients]);

  // Industry distribution
  const industryDistribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of clients) {
      if (c.primaryPerformanceOwner || c.secondaryPerformanceOwner) {
        const industry = c.industry || "Not specified";
        map.set(industry, (map.get(industry) || 0) + 1);
      }
    }
    return Array.from(map.entries())
      .map(([industry, count]) => ({ industry, count }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Stats
  const totalActiveClients = clients.length;
  const clientsWithPrimaryOwner = clients.filter((c) => c.primaryPerformanceOwner).length;
  const unassignedClients = clients.filter(
    (c) => !c.primaryPerformanceOwner && !c.secondaryPerformanceOwner
  );
  const atRiskClients = clients.filter((c) => c.performanceSentiment === "AT_RISK");
  const maxLoad = Math.max(...userBandwidth.map((u) => u.totalClients), 1);
  const avgLoad = userBandwidth.length > 0
    ? (userBandwidth.reduce((sum, u) => sum + u.totalClients, 0) / userBandwidth.length).toFixed(1)
    : "0";
  const coveragePercent = totalActiveClients > 0
    ? Math.round((clientsWithPrimaryOwner / totalActiveClients) * 100)
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
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
                <p className="text-xs text-muted-foreground">Primary Coverage</p>
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
                <p className="text-xs text-muted-foreground">Perf. Owners</p>
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
                <p className="text-2xl font-bold">{atRiskClients.length}</p>
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health + Coverage Row */}
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

        {/* Coverage Gaps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Coverage Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-green-50">
                <span className="text-green-700 font-medium">Both owners assigned</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-[10px]">
                  {ownerOverlapInsights.bothAssigned.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-blue-50">
                <span className="text-blue-700 font-medium">Only primary assigned</span>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-[10px]">
                  {ownerOverlapInsights.onlyPrimary.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-purple-50">
                <span className="text-purple-700 font-medium">Only secondary assigned</span>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[10px]">
                  {ownerOverlapInsights.onlySecondary.length}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-red-50">
                <span className="text-red-700 font-medium">Completely unassigned</span>
                <Badge variant="secondary" className="bg-red-100 text-red-800 text-[10px]">
                  {unassignedClients.length}
                </Badge>
              </div>
              {ownerOverlapInsights.sameOwnerClients.length > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-amber-50">
                  <span className="text-amber-700 font-medium">Same person as primary &amp; secondary</span>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px]">
                    {ownerOverlapInsights.sameOwnerClients.length}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {(unassignedClients.length > 0 || atRiskClients.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {unassignedClients.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  {unassignedClients.length} Unassigned Client{unassignedClients.length !== 1 ? "s" : ""}
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
                  {atRiskClients.length} At-Risk Client{atRiskClients.length !== 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {atRiskClients.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[10px] text-red-700 border-red-300">
                      {c.name}
                      {c.primaryPerformanceOwner ? ` → ${c.primaryPerformanceOwner.name}` : " (no owner)"}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Owner Bandwidth — expandable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Owner Bandwidth Analysis
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Click any owner to see their full client portfolio with sentiment &amp; mandates
          </p>
        </CardHeader>
        <CardContent>
          {userBandwidth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No performance owners assigned yet
            </p>
          ) : (
            <div className="space-y-2">
              {userBandwidth.map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                const isOverloaded = user.totalClients > (parseFloat(avgLoad) || 0) + 2;
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
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-primary">
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
                        {/* Stacked bar */}
                        <div className="flex h-3 rounded-full overflow-hidden bg-muted/50 mt-1.5">
                          {user.primaryClients.length > 0 && (
                            <div
                              className="bg-blue-500 transition-all"
                              style={{ width: `${(user.primaryClients.length / maxLoad) * 100}%` }}
                            />
                          )}
                          {user.secondaryClients.length > 0 && (
                            <div
                              className="bg-purple-400 transition-all"
                              style={{ width: `${(user.secondaryClients.length / maxLoad) * 100}%` }}
                            />
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-blue-600 font-medium">{user.primaryClients.length}P</span>
                          <span className="text-purple-600 font-medium">{user.secondaryClients.length}S</span>
                          <span className="font-bold text-sm">{user.totalClients}</span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
                        {/* Mandate breakdown for this user */}
                        {Object.keys(user.mandateCounts).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pb-2 border-b">
                            <span className="text-[10px] text-muted-foreground mr-1">Mandates:</span>
                            {Object.entries(user.mandateCounts)
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
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Role</th>
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Sentiment</th>
                                <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Mandates</th>
                              </tr>
                            </thead>
                            <tbody>
                              {user.primaryClients.map((c) => (
                                <tr key={`p-${c.name}`} className="border-b last:border-0">
                                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                                  <td className="px-2 py-1.5">
                                    <Badge className="text-[9px] px-1.5 py-0 bg-blue-100 text-blue-700 border-0">
                                      Primary
                                    </Badge>
                                  </td>
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
                              {user.secondaryClients.map((c) => (
                                <tr key={`s-${c.name}`} className="border-b last:border-0">
                                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                                  <td className="px-2 py-1.5">
                                    <Badge className="text-[9px] px-1.5 py-0 bg-purple-100 text-purple-700 border-0">
                                      Secondary
                                    </Badge>
                                  </td>
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

      {/* Team Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Team-wise Client Distribution
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Which team owns which clients — grouped by department &amp; team
          </p>
        </CardHeader>
        <CardContent>
          {teamBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team assignments found. Assign users to teams in Settings to see team breakdown.
            </p>
          ) : (
            <div className="space-y-2">
              {teamBreakdown.map((team) => {
                const isExpanded = expandedTeams.has(team.teamId);
                return (
                  <div key={team.teamId} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleTeam(team.teamId)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <div className="h-7 w-7 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold">{team.teamName}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{team.deptName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className="text-muted-foreground">
                          {team.members.length} member{team.members.length !== 1 ? "s" : ""}
                        </span>
                        <span className="font-semibold">{team.totalClients} clients</span>
                        {team.atRiskCount > 0 && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200">
                            {team.atRiskCount} at risk
                          </Badge>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-muted/10">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Member</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Primary Clients</th>
                              <th className="px-4 py-2 text-left font-medium text-muted-foreground">Secondary Clients</th>
                              <th className="px-4 py-2 text-right font-medium text-muted-foreground">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {team.members
                              .sort((a, b) => b.totalClients - a.totalClients)
                              .map((member) => (
                              <tr key={member.id} className="border-b last:border-0">
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                      <span className="text-[9px] font-bold text-primary">
                                        {member.name.charAt(0).toUpperCase()}
                                      </span>
                                    </div>
                                    <span className="font-medium">{member.name}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {member.primaryClients.length === 0 ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      member.primaryClients.map((c) => (
                                        <div key={c.name} className="flex items-center gap-0.5">
                                          <SentimentIcon status={c.sentiment} />
                                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700">
                                            {c.name}
                                          </Badge>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2">
                                  <div className="flex flex-wrap gap-1">
                                    {member.secondaryClients.length === 0 ? (
                                      <span className="text-muted-foreground">—</span>
                                    ) : (
                                      member.secondaryClients.map((c) => (
                                        <div key={c.name} className="flex items-center gap-0.5">
                                          <SentimentIcon status={c.sentiment} />
                                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700">
                                            {c.name}
                                          </Badge>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">
                                  {member.totalClients}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandate + Industry Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mandate Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              Mandate Distribution
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Mandate types across performance-managed clients
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
                          className="h-full rounded-full bg-blue-400 transition-all"
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
              <Building2 className="h-4 w-4 text-primary" />
              Industry Breakdown
            </CardTitle>
            <p className="text-[10px] text-muted-foreground">
              Client industries managed by performance owners
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
                          className="h-full rounded-full bg-indigo-400 transition-all"
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
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          Primary Owner
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
          Secondary Owner
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
