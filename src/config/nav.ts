import {
  LayoutDashboard,
  FolderKanban,
  Ticket,
  MessageSquare,
  Building2,
  Settings,
  Users,
  UserCog,
  Shield,
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
      { title: "Chat", href: "/chat", icon: MessageSquare },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Clients",
        href: "/admin/clients",
        icon: Building2,
        minRole: "ADMIN",
      },
      {
        title: "Settings",
        href: "/settings/team",
        icon: Settings,
        minRole: "MANAGER",
        children: [
          { title: "Team", href: "/settings/team", icon: Users, minRole: "ADMIN" },
          { title: "Departments", href: "/settings/departments", icon: Building2, minRole: "ADMIN" },
          { title: "Roles & Permissions", href: "/settings/roles", icon: Shield, minRole: "ADMIN" },
          { title: "General", href: "/settings/general", icon: UserCog, minRole: "ADMIN" },
          { title: "Profile", href: "/settings/profile", icon: Settings },
        ],
      },
    ],
  },
];
