export type UserRole = "ADMIN" | "MANAGER" | "OPERATOR" | "MEMBER" | "VIEWER" | "CONTRACTOR";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  ADMIN: 5,
  OPERATOR: 4,
  MANAGER: 3,
  MEMBER: 2,
  VIEWER: 1,
  CONTRACTOR: 0,
};

export function hasMinRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/** Check if a user has the CONTRACTOR role (special restricted access) */
export function isContractor(role: UserRole): boolean {
  return role === "CONTRACTOR";
}
