import { auth } from "@/lib/auth";

export type UserRole = "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    id: session.user.id as string,
    name: session.user.name as string,
    email: session.user.email as string,
    role: (session.user as { role: string }).role as UserRole,
    image: session.user.image,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth();
  if (!hasMinRole(user.role, role)) {
    throw new Error("Insufficient permissions");
  }
  return user;
}

// Permission checks for specific actions
export const permissions = {
  // Projects
  createProject: (role: UserRole) => hasMinRole(role, "MEMBER"),
  editProject: (role: UserRole) => hasMinRole(role, "MEMBER"),
  deleteProject: (role: UserRole) => hasMinRole(role, "MEMBER"),

  // Tasks
  createTask: (role: UserRole) => hasMinRole(role, "MEMBER"),
  editTask: (role: UserRole) => hasMinRole(role, "MEMBER"),
  deleteTask: (role: UserRole) => hasMinRole(role, "MEMBER"),

  // Tickets
  createTicket: (role: UserRole) => hasMinRole(role, "MEMBER"),
  approveTicket: (role: UserRole) => hasMinRole(role, "MEMBER"),

  // Assets
  uploadAsset: (role: UserRole) => hasMinRole(role, "MEMBER"),
  deleteAsset: (role: UserRole) => hasMinRole(role, "MANAGER"),

  // Repository
  manageClients: (role: UserRole) => hasMinRole(role, "MANAGER"),
  manageCampaigns: (role: UserRole) => hasMinRole(role, "MANAGER"),

  // Admin
  inviteUser: (role: UserRole) => hasMinRole(role, "ADMIN"),
  manageRoles: (role: UserRole) => hasMinRole(role, "ADMIN"),
  manageDepartments: (role: UserRole) => hasMinRole(role, "ADMIN"),
} as const;
