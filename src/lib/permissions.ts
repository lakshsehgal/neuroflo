import { getSession } from "@/lib/auth";
import { hasMinRole, type UserRole } from "@/lib/roles";

// Re-export for convenience
export { hasMinRole, type UserRole } from "@/lib/roles";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role as UserRole,
    image: session.image,
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
  deleteProject: (role: UserRole) => hasMinRole(role, "MANAGER"),

  // Tasks
  createTask: (role: UserRole) => hasMinRole(role, "MEMBER"),
  editTask: (role: UserRole) => hasMinRole(role, "MEMBER"),
  deleteTask: (role: UserRole) => hasMinRole(role, "MEMBER"),

  // Tickets
  createTicket: (role: UserRole) => hasMinRole(role, "MEMBER"),
  approveTicket: (role: UserRole) => hasMinRole(role, "MANAGER"),

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
