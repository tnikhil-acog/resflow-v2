import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

/**
 * GET /api/dashboard/users/status
 * Get active and inactive (exited) user counts
 * Access: HR Executive only
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR can access
    if (user.employee_role !== "hr_executive") {
      return ErrorResponses.accessDenied();
    }

    // Get user counts by status
    const statusCounts = await db
      .select({
        status: schema.employees.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.employees)
      .groupBy(schema.employees.status);

    const active = statusCounts.find((s) => s.status === "ACTIVE")?.count || 0;
    const exited = statusCounts.find((s) => s.status === "EXITED")?.count || 0;

    return Response.json({
      active_users: active,
      inactive_users: exited,
      total_users: active + exited,
    });
  } catch (error) {
    console.error("Error fetching user status counts:", error);
    return ErrorResponses.internalError();
  }
}
