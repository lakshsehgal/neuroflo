"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  Building2,
  TrendingUp,
  UserCheck,
  AlertTriangle,
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
  primaryClients: string[];
  secondaryClients: string[];
  totalClients: number;
  totalBilling: number;
  teamNames: string[];
};

type TeamBreakdown = {
  teamId: string;
  teamName: string;
  members: UserBandwidth[];
  totalClients: number;
  totalBilling: number;
};

export function PerformanceDashboard({ data }: Props) {
  const { clients, teamMembers } = data;

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
          totalBilling: 0,
          teamNames: teams.map((t) => t.teamName),
        });
      }
      return map.get(owner.id)!;
    };

    for (const client of clients) {
      if (client.primaryPerformanceOwner) {
        const user = getOrCreate(client.primaryPerformanceOwner);
        user.primaryClients.push(client.name);
        user.totalClients++;
        user.totalBilling += client.avgBillingAmount || 0;
      }
      if (client.secondaryPerformanceOwner) {
        const user = getOrCreate(client.secondaryPerformanceOwner);
        user.secondaryClients.push(client.name);
        user.totalClients++;
        user.totalBilling += client.avgBillingAmount || 0;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalClients - a.totalClients);
  }, [clients, userTeamsMap]);

  // Team-specific breakdown for performance marketing
  const teamBreakdown = useMemo(() => {
    // Find all performance-relevant teams by checking which teams have users who own clients
    const performanceUserIds = new Set(userBandwidth.map((u) => u.id));
    const teamMap = new Map<string, TeamBreakdown>();

    for (const tm of teamMembers) {
      if (!performanceUserIds.has(tm.userId)) continue;

      const user = userBandwidth.find((u) => u.id === tm.userId);
      if (!user) continue;

      if (!teamMap.has(tm.team.id)) {
        teamMap.set(tm.team.id, {
          teamId: tm.team.id,
          teamName: `${tm.team.name} (${tm.team.department.name})`,
          members: [],
          totalClients: 0,
          totalBilling: 0,
        });
      }

      const team = teamMap.get(tm.team.id)!;
      if (!team.members.find((m) => m.id === user.id)) {
        team.members.push(user);
        team.totalClients += user.totalClients;
        team.totalBilling += user.totalBilling;
      }
    }

    return Array.from(teamMap.values()).sort((a, b) => b.totalClients - a.totalClients);
  }, [teamMembers, userBandwidth]);

  // Stats
  const totalActiveClients = clients.length;
  const clientsWithPrimaryOwner = clients.filter((c) => c.primaryPerformanceOwner).length;
  const clientsWithSecondaryOwner = clients.filter((c) => c.secondaryPerformanceOwner).length;
  const unassignedClients = clients.filter(
    (c) => !c.primaryPerformanceOwner && !c.secondaryPerformanceOwner
  );
  const maxLoad = Math.max(...userBandwidth.map((u) => u.totalClients), 1);
  const avgLoad = userBandwidth.length > 0
    ? Math.round(userBandwidth.reduce((sum, u) => sum + u.totalClients, 0) / userBandwidth.length)
    : 0;

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clientsWithPrimaryOwner}</p>
                <p className="text-xs text-muted-foreground">Primary Assigned</p>
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
                <p className="text-2xl font-bold">{clientsWithSecondaryOwner}</p>
                <p className="text-xs text-muted-foreground">Secondary Assigned</p>
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
      </div>

      {/* Unassigned Clients Alert */}
      {unassignedClients.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              {unassignedClients.length} Client{unassignedClients.length !== 1 ? "s" : ""} Without Performance Owner
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

      {/* User Bandwidth Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Owner Bandwidth Analysis
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Client load distribution across performance owners
          </p>
        </CardHeader>
        <CardContent>
          {userBandwidth.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No performance owners assigned yet
            </p>
          ) : (
            <div className="space-y-4">
              {userBandwidth.map((user) => (
                <div key={user.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">
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
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-blue-600 font-medium">
                        {user.primaryClients.length} primary
                      </span>
                      <span className="text-purple-600 font-medium">
                        {user.secondaryClients.length} secondary
                      </span>
                      <span className="font-semibold">{user.totalClients} total</span>
                    </div>
                  </div>
                  {/* Stacked bar */}
                  <div className="flex h-5 rounded-md overflow-hidden bg-muted/50">
                    {user.primaryClients.length > 0 && (
                      <div
                        className="bg-blue-500 transition-all flex items-center justify-center"
                        style={{
                          width: `${(user.primaryClients.length / maxLoad) * 100}%`,
                        }}
                        title={`Primary: ${user.primaryClients.join(", ")}`}
                      >
                        <span className="text-[9px] text-white font-medium truncate px-1">
                          {user.primaryClients.length}
                        </span>
                      </div>
                    )}
                    {user.secondaryClients.length > 0 && (
                      <div
                        className="bg-purple-400 transition-all flex items-center justify-center"
                        style={{
                          width: `${(user.secondaryClients.length / maxLoad) * 100}%`,
                        }}
                        title={`Secondary: ${user.secondaryClients.join(", ")}`}
                      >
                        <span className="text-[9px] text-white font-medium truncate px-1">
                          {user.secondaryClients.length}
                        </span>
                      </div>
                    )}
                  </div>
                  {/* Client list */}
                  <div className="flex flex-wrap gap-1 pl-9">
                    {user.primaryClients.map((name) => (
                      <Badge
                        key={`p-${name}`}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {name}
                      </Badge>
                    ))}
                    {user.secondaryClients.map((name) => (
                      <Badge
                        key={`s-${name}`}
                        variant="secondary"
                        className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200"
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

      {/* Team Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Team-wise Client Distribution
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Which team owns which clients — breakdown by department &amp; team
          </p>
        </CardHeader>
        <CardContent>
          {teamBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No team assignments found. Assign users to teams in Settings to see team breakdown.
            </p>
          ) : (
            <div className="space-y-6">
              {teamBreakdown.map((team) => (
                <div key={team.teamId} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold">{team.teamName}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{team.members.length} member{team.members.length !== 1 ? "s" : ""}</span>
                      <span className="font-medium text-foreground">
                        {team.totalClients} client{team.totalClients !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Member</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Primary Clients</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Secondary Clients</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {team.members.map((member) => (
                          <tr key={member.id} className="border-b last:border-0">
                            <td className="px-3 py-2 font-medium">{member.name}</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {member.primaryClients.length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  member.primaryClients.map((name) => (
                                    <Badge
                                      key={name}
                                      variant="secondary"
                                      className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-700"
                                    >
                                      {name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {member.secondaryClients.length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  member.secondaryClients.map((name) => (
                                    <Badge
                                      key={name}
                                      variant="secondary"
                                      className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-700"
                                    >
                                      {name}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-semibold">
                              {member.totalClients}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
          Primary Owner
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-sm bg-purple-400" />
          Secondary Owner
        </div>
      </div>
    </div>
  );
}
