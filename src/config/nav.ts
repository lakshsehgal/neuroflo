import {
  LayoutDashboard,
  FolderKanban,
  Ticket,
  Building2,
  Settings,
  Users,
  UserCog,
  Shield,
  Bell,
  Crown,
  User,
  ListTodo,
  ClipboardList,
  Workflow,
  Plug,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/lib/roles";

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
      { title: "UGC Projects", href: "/projects", icon: FolderKanban },
      { title: "Team Tasks", href: "/team-tasks", icon: ListTodo },
      { title: "Creative Tickets", href: "/tickets", icon: Ticket },
      { title: "Client Mandates", href: "/client-mandates", icon: ClipboardList },
      { title: "Workflows", href: "/workflows", icon: Workflow, minRole: "MANAGER" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "Profile", href: "/settings/profile", icon: User },
      { title: "Notifications", href: "/settings/notifications", icon: Bell },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        title: "Clients",
        href: "/admin/clients",
        icon: Building2,
        minRole: "OPERATOR",
      },
      {
        title: "Founder's Hub",
        href: "/admin/founders",
        icon: Crown,
        minRole: "ADMIN",
      },
      {
        title: "Settings",
        href: "/settings/team",
        icon: Settings,
        minRole: "MANAGER",
        children: [
          { title: "Team", href: "/settings/team", icon: Users, minRole: "ADMIN" },
          { title: "Departments & Teams", href: "/settings/departments", icon: Building2, minRole: "ADMIN" },
          { title: "Roles & Permissions", href: "/settings/roles", icon: Shield, minRole: "ADMIN" },
          { title: "General", href: "/settings/general", icon: UserCog, minRole: "ADMIN" },
          { title: "Integrations", href: "/settings/integrations", icon: Plug, minRole: "MANAGER" },
        ],
      },
    ],
  },
];
