import {
  LayoutDashboard,
  FolderKanban,
  Ticket,
  Image,
  Building2,
  Megaphone,
  BarChart3,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  minRole?: UserRole;
  children?: NavItem[];
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const navConfig: NavSection[] = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Work",
    items: [
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Creative Tickets", href: "/tickets", icon: Ticket },
    ],
  },
  {
    label: "Library",
    items: [
      { title: "Assets", href: "/assets", icon: Image },
      { title: "Clients", href: "/repository/clients", icon: Building2 },
      { title: "Campaigns", href: "/repository/campaigns", icon: Megaphone },
      { title: "Reports", href: "/repository/reports", icon: BarChart3 },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Settings",
        href: "/settings/team",
        icon: Settings,
        minRole: "MANAGER",
        children: [
          { title: "Team", href: "/settings/team", icon: Users, minRole: "ADMIN" },
          { title: "Departments", href: "/settings/departments", icon: Building2, minRole: "ADMIN" },
          { title: "Profile", href: "/settings/profile", icon: Settings },
        ],
      },
    ],
  },
];
