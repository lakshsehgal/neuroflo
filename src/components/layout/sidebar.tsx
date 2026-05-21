"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navConfig, type NavItem } from "@/config/nav";
import { hasMinRole, type UserRole } from "@/lib/roles";
import { ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

interface SidebarProps {
  userRole: UserRole;
}

const STORAGE_KEY = "neuroid:sidebar-collapsed";

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
    setMounted(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      if (item.minRole && !hasMinRole(userRole, item.minRole)) return false;
      return true;
    });
  }

  return (
    <aside
      data-collapsed={collapsed}
      style={{ width: collapsed ? 72 : 248 }}
      className={cn(
        "group/sidebar relative flex h-screen shrink-0 flex-col border-r border-border/70 bg-surface",
        "transition-[width] duration-300 ease-out will-change-[width]",
        !mounted && "duration-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between gap-2 border-b border-border/70 px-3.5">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2.5 overflow-hidden rounded-md px-1 py-1 text-foreground transition-opacity",
            "hover:opacity-90"
          )}
          aria-label="Neuroid"
        >
          <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-lg gradient-brand text-brand-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span
            className={cn(
              "text-[15px] font-semibold tracking-tight whitespace-nowrap transition-[opacity,transform] duration-200",
              collapsed && "pointer-events-none -translate-x-2 opacity-0"
            )}
          >
            Neuroid
          </span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5">
        {navConfig.map((section, sectionIdx) => {
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;

          return (
            <div key={section.label} className={cn(sectionIdx > 0 && "mt-5")}>
              <p
                className={cn(
                  "mb-1.5 px-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/80 transition-opacity duration-200",
                  collapsed && "opacity-0"
                )}
              >
                {collapsed ? "·" : section.label}
              </p>
              <div className="space-y-0.5">
                {filtered.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    return (
                      <div key={item.href} className="space-y-0.5">
                        {filteredChildren.map((child) => {
                          const childActive = pathname === child.href;
                          const ChildIcon = child.icon;
                          return (
                            <NavLink
                              key={child.href}
                              href={child.href}
                              icon={ChildIcon}
                              label={child.title}
                              active={childActive}
                              collapsed={collapsed}
                            />
                          );
                        })}
                      </div>
                    );
                  }

                  return (
                    <NavLink
                      key={item.href}
                      href={item.href}
                      icon={Icon}
                      label={item.title}
                      active={isActive}
                      collapsed={collapsed}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer accent */}
      <div className="border-t border-border/70 px-3 py-2.5">
        <div
          className={cn(
            "flex items-center gap-2 text-[11px] text-muted-foreground transition-opacity duration-200",
            collapsed && "opacity-0"
          )}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_color-mix(in_oklch,theme(colors.emerald.500)_18%,transparent)]" />
          All systems operational
        </div>
      </div>
    </aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        "group/link relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium",
        "transition-colors duration-150",
        active
          ? "bg-brand-muted text-brand"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {/* Active indicator bar */}
      <span
        aria-hidden
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-brand" : "")} />
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-[opacity,transform] duration-200",
          collapsed && "pointer-events-none -translate-x-2 opacity-0 w-0"
        )}
      >
        {label}
      </span>
    </Link>
  );
}
