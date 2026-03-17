"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageTransition, AnimatedTableBody, AnimatedRow } from "@/components/motion";
import { Search, Building2, FileText, X } from "lucide-react";

type ClientMandate = {
  id: string;
  name: string;
  mandates: string[];
  sow: string | null;
};

const MANDATE_COLORS: Record<string, string> = {
  "Meta Ads": "bg-blue-100 text-blue-800",
  "Google Ads": "bg-green-100 text-green-800",
  "Post-Production": "bg-purple-100 text-purple-800",
  "UGCs": "bg-amber-100 text-amber-800",
  "Whatsapp Marketing": "bg-emerald-100 text-emerald-800",
  "CRO": "bg-red-100 text-red-800",
  "Statics Only": "bg-slate-100 text-slate-800",
};

export function ClientMandatesContent({
  clients,
}: {
  clients: ClientMandate[];
}) {
  const [search, setSearch] = useState("");
  const [filterMandate, setFilterMandate] = useState<string | null>(null);
  const [sowClient, setSowClient] = useState<ClientMandate | null>(null);

  const filtered = clients.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchesMandate = !filterMandate || c.mandates.includes(filterMandate);
    return matchesSearch && matchesMandate;
  });

  // Collect all unique mandates for filter chips
  const allMandates = Array.from(new Set(clients.flatMap((c) => c.mandates))).sort();

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Client Mandates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Active clients, their mandates, and scope of work — visible to everyone.
          </p>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clients..."
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allMandates.map((m) => (
              <button
                key={m}
                onClick={() => setFilterMandate(filterMandate === m ? null : m)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                  filterMandate === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted border-border"
                }`}
              >
                {m}
              </button>
            ))}
            {filterMandate && (
              <button
                onClick={() => setFilterMandate(null)}
                className="rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{filtered.length} active client{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Mandates
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    Scope of Work
                  </th>
                </tr>
              </thead>
              <AnimatedTableBody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-12 text-center text-muted-foreground">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  filtered.map((client) => (
                    <AnimatedRow
                      key={client.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {client.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-sm">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {client.mandates.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {client.mandates.map((m) => (
                              <Badge
                                key={m}
                                variant="secondary"
                                className={`text-[10px] px-2 py-0.5 ${MANDATE_COLORS[m] || ""}`}
                              >
                                {m}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {client.sow ? (
                          <button
                            onClick={() => setSowClient(client)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            View SOW
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </AnimatedRow>
                  ))
                )}
              </AnimatedTableBody>
            </table>
          </div>
        </Card>

        {/* SOW Dialog */}
        <Dialog open={!!sowClient} onOpenChange={(open) => !open && setSowClient(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {sowClient?.name} — Scope of Work
              </DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none mt-4">
              <div className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
                {sowClient?.sow}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageTransition>
  );
}
