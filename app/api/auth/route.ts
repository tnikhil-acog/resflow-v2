import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser, createToken } from "@/lib/auth";
import { authenticateLDAP, isValidLDAPUsername } from "@/lib/ldap-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";

// POST /api/auth/login
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (action === "logout") {
    return handleLogout(req);
  }

  return handleLogin(req);
}

// GET /api/auth/me
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Fetch complete user details from database
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.id));

    if (!employee) {
      return ErrorResponses.notFound("User");
    }

    // Return all user fields
    return successResponse({
      id: employee.id,
      employee_code: employee.employee_code,
      ldap_username: employee.ldap_username,
      full_name: employee.full_name,
      email: employee.email,
      employee_type: employee.employee_type,
      employee_role: employee.employee_role,
      employee_design: employee.employee_design,
      working_location: employee.working_location,
      department_id: employee.department_id,
      project_manager_id: employee.project_manager_id,
      experience_years: employee.experience_years,
      resume_url: employee.resume_url,
      college: employee.college,
      degree: employee.degree,
      status: employee.status,
      joined_on: employee.joined_on,
      exited_on: employee.exited_on,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error fetching current user:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * Handle user login with LDAP authentication
 *
 * MOCK TESTING INSTRUCTIONS:
 * 1. Use any ldap_username that exists in your employees table
 * 2. Use password "test123" to simulate LDAP validation
 * 3. The backend will fetch user details from DB after LDAP validates
 *
 * Example request:
 * POST /api/auth/login
 * Body: { "ldap_username": "john.doe", "password": "test123" }
 */
async function handleLogin(req: NextRequest) {
  try {
    const body = await req.json();
    const { ldap_username, password } = body;

    console.log(`[AUTH] Login attempt for username: ${ldap_username}`);

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "ldap_username",
      "password",
    ]);
    if (missingFields) {
      console.log(`[AUTH] ✗ Missing fields: ${missingFields}`);
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate LDAP username format
    if (!isValidLDAPUsername(ldap_username)) {
      console.log(`[AUTH] ✗ Invalid username format: ${ldap_username}`);
      return ErrorResponses.badRequest("Invalid LDAP username format");
    }

    // Step 1: Authenticate against LDAP (mock)
    console.log(`[AUTH] Step 1: Validating with LDAP...`);
    const ldapResult = await authenticateLDAP(ldap_username, password);

    if (!ldapResult.success) {
      console.log(`[AUTH] ✗ LDAP validation failed`);
      return ErrorResponses.unauthorized(
        ldapResult.error || "Invalid credentials",
      );
    }

    console.log(`[AUTH] ✓ LDAP validated username: ${ldapResult.username}`);

    // Step 2: Fetch user from database using validated username
    console.log(`[AUTH] Step 2: Fetching user from database...`);
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.ldap_username, ldap_username));

    if (!employee) {
      console.log(`[AUTH] ✗ User not found in database: ${ldap_username}`);
      return ErrorResponses.unauthorized(
        "User not found in system. Please contact administrator.",
      );
    }

    console.log(
      `[AUTH] ✓ Found user: ${employee.full_name} (${employee.employee_code})`,
    );

    // Check if user is active
    if (employee.status !== "ACTIVE") {
      console.log(`[AUTH] ✗ User status is ${employee.status}`);
      return ErrorResponses.unauthorized(
        `Account is ${employee.status}. Please contact administrator.`,
      );
    }

    // Step 3: Generate JWT token
    console.log(`[AUTH] Step 3: Generating JWT token...`);
    const token = await createToken({
      id: employee.id,
      employee_code: employee.employee_code,
      ldap_username: employee.ldap_username,
      employee_role: employee.employee_role as
        | "employee"
        | "project_manager"
        | "hr_executive",
      full_name: employee.full_name,
      email: employee.email,
    });

    console.log(`[AUTH] ✓ Login successful for ${ldap_username}`);

    // Return token and user details
    return successResponse({
      token,
      user: {
        id: employee.id,
        employee_code: employee.employee_code,
        ldap_username: employee.ldap_username,
        full_name: employee.full_name,
        email: employee.email,
        employee_type: employee.employee_type,
        employee_role: employee.employee_role,
        employee_design: employee.employee_design,
        status: employee.status,
      },
    });
  } catch (error) {
    console.error("[AUTH] ✗ Login error:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * Handle user logout
 * Note: JWT is stateless, so logout is handled client-side by removing the token
 * For token blacklisting, implement a token_blacklist table
 */
async function handleLogout(req: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser(req);

    // TODO: Optional - Add token to blacklist table
    // const token = req.headers.get('Authorization')?.substring(7);
    // await db.insert(schema.tokenBlacklist).values({
    //   token,
    //   user_id: user.id,
    //   blacklisted_at: new Date(),
    // });

    return successResponse({
      message: "Logged out successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Logout error:", error);
    return ErrorResponses.internalError();
  }
}
