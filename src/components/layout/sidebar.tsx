"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navConfig, type NavItem } from "@/config/nav";
import { hasMinRole, type UserRole } from "@/lib/permissions";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      if (item.minRole && !hasMinRole(userRole, item.minRole)) return false;
      return true;
    });
  }

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-xl font-bold tracking-tight">
            Neuroid
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navConfig.map((section) => {
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;

          return (
            <div key={section.label}>
              {!collapsed && (
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {section.label}
                </p>
              )}
              <div className="space-y-1">
                {filtered.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    return (
                      <div key={item.href} className="space-y-1">
                        {filteredChildren.map((child) => {
                          const childActive = pathname === child.href;
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={cn(
                                "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                childActive
                                  ? "bg-accent text-accent-foreground"
                                  : "text-muted-foreground",
                                collapsed && "justify-center px-0"
                              )}
                              title={collapsed ? child.title : undefined}
                            >
                              <ChildIcon className="h-4 w-4 shrink-0" />
                              {!collapsed && <span>{child.title}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground",
                        collapsed && "justify-center px-0"
                      )}
                      title={collapsed ? item.title : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  );
                })}
              </div>
              <Separator className="mt-3" />
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
