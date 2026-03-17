"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Palette,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  BarChart3,
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
  avgBillingAmount: number | null;
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
  clients: string[];
  mandateBreakdown: Record<string, number>;
  totalBilling: number;
  teamNames: string[];
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

export function CreativeDashboard({ data }: Props) {
  const { clients, teamMembers } = data;

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
          totalBilling: 0,
          teamNames: userTeamsMap.get(owner.id) || [],
        });
      }

      const user = map.get(owner.id)!;
      user.clients.push(client.name);
      user.totalBilling += client.avgBillingAmount || 0;

      // Track mandates this owner handles through this client
      for (const mandate of client.mandates) {
        user.mandateBreakdown[mandate] = (user.mandateBreakdown[mandate] || 0) + 1;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.clients.length - a.clients.length);
  }, [clients, userTeamsMap]);

  // Mandate distribution across all creative-owned clients
  const mandateDistribution = useMemo(() => {
    const map = new Map<string, { count: number; clients: string[] }>();
    for (const client of clients) {
      if (!client.creativeStrategyOwner) continue;
      for (const mandate of client.mandates) {
        const existing = map.get(mandate) || { count: 0, clients: [] };
        existing.count++;
        existing.clients.push(client.name);
        map.set(mandate, existing);
      }
    }
    return Array.from(map.entries())
      .map(([mandate, data]) => ({ mandate, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [clients]);

  // Stats
  const totalActiveClients = clients.length;
  const clientsWithCreativeOwner = clients.filter((c) => c.creativeStrategyOwner).length;
  const unassignedClients = clients.filter((c) => !c.creativeStrategyOwner);
  const maxLoad = Math.max(...userBandwidth.map((u) => u.clients.length), 1);
  const avgLoad = userBandwidth.length > 0
    ? Math.round(
        userBandwidth.reduce((sum, u) => sum + u.clients.length, 0) / userBandwidth.length
      )
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientsWithCreativeOwner}</p>
                <p className="text-xs text-muted-foreground">Creative Assigned</p>
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
                <p className="text-xs text-muted-foreground">Avg Clients/Person</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userBandwidth.length}</p>
                <p className="text-xs text-muted-foreground">Creative Owners</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unassigned Clients Alert */}
      {unassignedClients.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              {unassignedClients.length} Client{unassignedClients.length !== 1 ? "s" : ""} Without Creative Owner
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassignedClients.map((c) => (
                <Badge key={c.id} variant="outline" className="text-amber-700 border-amber-300">
                  {c.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Owner Bandwidth */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Creative Owner Bandwidth
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Client load distribution across creative strategy owners
          </p>
        </CardHeader>
        <CardContent>
          {userBandwidth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No creative owners assigned yet
            </p>
          ) : (
            <div className="space-y-4">
              {userBandwidth.map((user) => (
                <div key={user.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-pink-100 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-pink-600">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">{user.name}</span>
                        {user.teamNames.length > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-2">
                            {user.teamNames.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold">
                      {user.clients.length} client{user.clients.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="flex h-5 rounded-md overflow-hidden bg-muted/50">
                    <div
                      className="bg-pink-500 transition-all flex items-center justify-center"
                      style={{ width: `${(user.clients.length / maxLoad) * 100}%` }}
                      title={user.clients.join(", ")}
                    >
                      <span className="text-[9px] text-white font-medium truncate px-1">
                        {user.clients.length}
                      </span>
                    </div>
                  </div>
                  {/* Client badges */}
                  <div className="flex flex-wrap gap-1 pl-9">
                    {user.clients.map((name) => (
                      <Badge
                        key={name}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 bg-pink-50 text-pink-700 border-pink-200"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mandate Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Mandate Coverage
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            How many clients per mandate type have creative owners assigned
          </p>
        </CardHeader>
        <CardContent>
          {mandateDistribution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No mandate data available
            </p>
          ) : (
            <div className="space-y-3">
              {mandateDistribution.map(({ mandate, count, clients: mandateClients }) => {
                const maxMandateCount = mandateDistribution[0]?.count || 1;
                return (
                  <div key={mandate} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0.5 ${MANDATE_COLORS[mandate] || ""}`}
                      >
                        {mandate}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {count} client{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex h-4 rounded-md overflow-hidden bg-muted/50">
                      <div
                        className="bg-pink-400 transition-all rounded-md"
                        style={{ width: `${(count / maxMandateCount) * 100}%` }}
                        title={mandateClients.join(", ")}
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
  );
}
