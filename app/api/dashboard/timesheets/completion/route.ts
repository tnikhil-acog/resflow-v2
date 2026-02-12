import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { and, gte, lte, eq, sql } from "drizzle-orm";

/**
 * GET /api/dashboard/timesheets/completion
 * Get timesheet completion progress for a period
 * Query params: week_start_date
 * Access: HR and PM
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR and PM can access
    if (
      user.employee_role !== "hr_executive" &&
      user.employee_role !== "project_manager"
    ) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get("week_start_date");

    if (!weekStart) {
      return ErrorResponses.badRequest("week_start_date is required");
    }

    // Get total active employees
    const [totalEmployees] = await db
      .select({
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));

    // Get employees who submitted reports for this week
    const [submittedCount] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${schema.reports.emp_id})::int`,
      })
      .from(schema.reports)
      .innerJoin(
        schema.employees,
        eq(schema.reports.emp_id, schema.employees.id),
      )
      .where(
        and(
          eq(schema.reports.week_start_date, weekStart),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );

    const total = totalEmployees.count;
    const submitted = submittedCount.count;
    const pending = total - submitted;

    return Response.json({
      total_employees: total,
      submitted: submitted,
      pending: pending,
      completion_percentage:
        total > 0 ? Math.round((submitted / total) * 100) : 0,
      week_start: weekStart,
    });
  } catch (error) {
    console.error("Error fetching timesheet completion:", error);
    return ErrorResponses.internalError();
  }
}
