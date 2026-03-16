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
