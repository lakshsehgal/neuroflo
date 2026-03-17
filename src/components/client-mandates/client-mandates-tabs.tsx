"use client";

import { ReactNode } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageTransition } from "@/components/motion";
import { Building2, BarChart3, Palette } from "lucide-react";

export function ClientMandatesTabs({
  mandatesTab,
  performanceTab,
  creativeTab,
}: {
  mandatesTab: ReactNode;
  performanceTab: ReactNode;
  creativeTab: ReactNode;
}) {
  return (
    <PageTransition>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Client Mandates
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Client overview, ownership dashboards, and scope of work — visible to everyone.
          </p>
        </div>

        <Tabs defaultValue="mandates">
          <TabsList>
            <TabsTrigger value="mandates" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Mandates
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="creative" className="gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Creative
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mandates">{mandatesTab}</TabsContent>
          <TabsContent value="performance">{performanceTab}</TabsContent>
          <TabsContent value="creative">{creativeTab}</TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
