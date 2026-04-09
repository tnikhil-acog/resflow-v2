import { NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";

// JWT secret - should be in environment variables
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production",
);

// DB role enum values (as stored in database)
export type DbRole = "EMP" | "PM" | "HR";

// App role strings (used throughout application)
export type EmployeeRole = "employee" | "project_manager" | "hr_executive";

// DB to App mapping
export const ROLE_MAP: Record<DbRole, EmployeeRole> = {
  EMP: "employee",
  PM: "project_manager",
  HR: "hr_executive",
};

// App to DB mapping
export const ROLE_REVERSE_MAP: Record<EmployeeRole, DbRole> = {
  employee: "EMP",
  project_manager: "PM",
  hr_executive: "HR",
};

// Mapping functions
export function mapDbRoleToApp(dbRole: DbRole): EmployeeRole {
  return ROLE_MAP[dbRole];
}

export function mapAppRoleToDb(appRole: EmployeeRole): DbRole {
  return ROLE_REVERSE_MAP[appRole];
}

export interface User {
  id: string;
  employee_code: string;
  ldap_username: string;
  employee_role: EmployeeRole;
  full_name?: string;
  email?: string;
}

/**
 * Get current user from JWT token in Authorization header
 */
export async function getCurrentUser(req: NextRequest): Promise<User> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("No authorization token provided");
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      id: payload.id as string,
      employee_code: payload.employee_code as string,
      ldap_username: payload.ldap_username as string,
      employee_role: payload.employee_role as EmployeeRole,
      full_name: payload.full_name as string,
      email: payload.email as string,
    } as User;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

/**
 * Create a JWT token
 */
export async function createToken(user: User): Promise<string> {
  return await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Check if user has one of the required roles
 */
export function checkRole(user: User, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.employee_role);
}

/**
 * Middleware to verify user has required role
 */
export function requireRole(allowedRoles: string[]) {
  return async (req: NextRequest) => {
    try {
      const user = await getCurrentUser(req);

      if (!checkRole(user, allowedRoles)) {
        return {
          error: "Access denied",
          status: 403,
        };
      }

      return { user };
    } catch (error) {
      return {
        error: "Unauthorized",
        status: 401,
      };
    }
  };
}
