import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userRole={user.role} />
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Subtle ambient gradient behind content */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklch,var(--brand)_8%,transparent),transparent_60%)]"
        />
        <Header user={user} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
