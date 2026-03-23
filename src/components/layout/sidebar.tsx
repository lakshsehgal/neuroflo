"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navConfig, type NavItem } from "@/config/nav";
import { hasMinRole, isContractor, type UserRole } from "@/lib/roles";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SidebarProps {
  userRole: UserRole;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Allowed paths for CONTRACTOR role
  const contractorAllowedPaths = ["/tickets", "/settings/profile", "/settings/notifications"];

  function filterItems(items: NavItem[]): NavItem[] {
    return items.filter((item) => {
      // CONTRACTOR can only access Creative Tickets and Account items
      if (isContractor(userRole)) {
        return contractorAllowedPaths.some(
          (path) => item.href === path || item.href.startsWith(path + "/")
        );
      }
      if (item.minRole && !hasMinRole(userRole, item.minRole)) return false;
      return true;
    });
  }

  return (
    <motion.aside
      className="flex h-screen flex-col border-r bg-card"
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Logo */}
      <div className="flex h-14 items-center justify-between border-b px-4">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Link
                href="/dashboard"
                className="flex items-center gap-2"
              >
                <Image
                  src="/images/neuroid-logo.webp"
                  alt="Neuroid"
                  width={120}
                  height={28}
                  priority
                />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 shrink-0"
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.div>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navConfig.map((section) => {
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;

          return (
            <div key={section.label}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {section.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                {filtered.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  const Icon = item.icon;

                  if (item.children) {
                    const filteredChildren = filterItems(item.children);
                    return (
                      <div key={item.href} className="space-y-1">
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
                      badge={0}
                    />
                  );
                })}
              </div>
              <Separator className="mt-3" />
            </div>
          );
        })}
      </nav>
    </motion.aside>
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
  badge = 0,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed: boolean;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-md bg-accent"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          style={{ zIndex: -1 }}
        />
      )}
      <div className="relative shrink-0">
        <Icon className="h-4 w-4" />
        {badge > 0 && collapsed && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
      {badge > 0 && !collapsed && (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
