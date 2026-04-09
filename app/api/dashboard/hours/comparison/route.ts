import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { and, gte, lte, eq, sql } from "drizzle-orm";

/**
 * GET /api/dashboard/hours/comparison
 * Get billable vs non-billable hours comparison for a period
 * Query params: start_date, end_date, period (week|month)
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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    if (!startDate || !endDate) {
      return ErrorResponses.badRequest("start_date and end_date are required");
    }

    // Get billable and non-billable hours
    const result = await db
      .select({
        billable_hours: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${schema.projectAllocation.billability} = true 
            THEN ${schema.dailyProjectLogs.hours}::numeric 
            ELSE 0 
          END), 0)
        `,
        non_billable_hours: sql<number>`
          COALESCE(SUM(CASE 
            WHEN ${schema.projectAllocation.billability} = false 
            THEN ${schema.dailyProjectLogs.hours}::numeric 
            ELSE 0 
          END), 0)
        `,
        total_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
        `,
      })
      .from(schema.dailyProjectLogs)
      .leftJoin(
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
        ),
      )
      .where(
        and(
          gte(schema.dailyProjectLogs.log_date, startDate),
          lte(schema.dailyProjectLogs.log_date, endDate),
        ),
      );

    const data = result[0];
    const billableHours = parseFloat(data.billable_hours.toString());
    const nonBillableHours = parseFloat(data.non_billable_hours.toString());
    const totalHours = parseFloat(data.total_hours.toString());

    return Response.json({
      billable_hours: billableHours.toFixed(2),
      non_billable_hours: nonBillableHours.toFixed(2),
      total_hours: totalHours.toFixed(2),
      billable_percentage:
        totalHours > 0 ? Math.round((billableHours / totalHours) * 100) : 0,
      period: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching hours comparison:", error);
    return ErrorResponses.internalError();
  }
}
