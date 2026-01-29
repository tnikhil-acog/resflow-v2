import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";

// GET /api/auth/me
export async function GET(req: NextRequest) {
  try {
    console.log("[API /auth/me] Fetching current user...");
    const user = await getCurrentUser(req);
    console.log("[API /auth/me] Current user from token:", {
      id: user.id,
      employee_code: user.employee_code,
      role: user.employee_role,
    });

    // Fetch complete user details from database
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, user.id));

    console.log(
      "[API /auth/me] Employee from DB:",
      employee ? "Found" : "Not found",
    );

    if (!employee) {
      console.error("[API /auth/me] Employee not found in database");
      return ErrorResponses.notFound("User");
    }

    console.log("[API /auth/me] Returning employee data:", {
      id: employee.id,
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      role: employee.employee_role,
    });

    return successResponse({
      id: employee.id,
      employee_code: employee.employee_code,
      ldap_username: employee.ldap_username,
      full_name: employee.full_name,
      email: employee.email,
      gender: employee.gender,
      employee_type: employee.employee_type,
      employee_role: employee.employee_role,
      employee_design: employee.employee_design,
      working_location: employee.working_location,
      department_id: employee.department_id,
      reporting_manager_id: employee.reporting_manager_id,
      experience_years: employee.experience_years,
      resume_url: employee.resume_url,
      college: employee.college,
      educational_stream: employee.educational_stream,
      status: employee.status,
      joined_on: employee.joined_on,
      exited_on: employee.exited_on,
    });
  } catch (error) {
    console.error("[API /auth/me] Error:", error);
    return ErrorResponses.unauthorized();
  }
}
