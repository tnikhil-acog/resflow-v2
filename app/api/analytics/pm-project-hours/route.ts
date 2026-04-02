import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql } from "drizzle-orm";

// GET /api/analytics/pm-project-hours
// Returns total hours logged this week, grouped by project, scoped to the PM's own projects.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (
      user.employee_role !== "project_manager" &&
      user.employee_role !== "hr_executive"
    ) {
      return ErrorResponses.accessDenied();
    }

    // Current week bounds (Mon–Sun)
    const now = new Date();
    const day = now.getDay(); // 0 = Sun
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const weekStart = monday.toISOString().split("T")[0];
    const weekEnd = sunday.toISOString().split("T")[0];

    const rows = await db
      .select({
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        total_hours: sql<string>`COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)`,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .where(
        and(
          eq(schema.projects.project_manager_id, user.id),
          sql`${schema.dailyProjectLogs.log_date} >= ${weekStart}`,
          sql`${schema.dailyProjectLogs.log_date} <= ${weekEnd}`,
        ),
      )
      .groupBy(
        schema.projects.id,
        schema.projects.project_code,
        schema.projects.project_name,
      )
      .orderBy(
        sql`COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0) DESC`,
      );

    return NextResponse.json({
      data: rows.map((r) => ({
        project_code: r.project_code,
        project_name: r.project_name,
        hours: parseFloat(r.total_hours),
      })),
      week: { start: weekStart, end: weekEnd },
    });
  } catch (error) {
    console.error("Error fetching PM project hours:", error);
    return ErrorResponses.internalError();
  }
}
