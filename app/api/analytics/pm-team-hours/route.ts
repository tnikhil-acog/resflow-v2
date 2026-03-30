import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull } from "drizzle-orm";

// GET /api/analytics/pm-team-hours
// Returns hours logged this week per team member, for the PM's projects.
// Team members are defined as employees currently allocated to any of the PM's projects.
// Members who haven't logged any hours this week are included with hours = 0.
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
    const today = now.toISOString().split("T")[0];

    // Step 1: all currently active team members on PM's projects
    const teamMembers = await db
      .selectDistinct({
        emp_id: schema.projectAllocation.emp_id,
        full_name: schema.employees.full_name,
      })
      .from(schema.projectAllocation)
      .innerJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.projectAllocation.emp_id, schema.employees.id),
      )
      .where(
        and(
          eq(schema.projects.project_manager_id, user.id),
          sql`${schema.projectAllocation.start_date} <= ${today}`,
          or(
            isNull(schema.projectAllocation.end_date),
            sql`${schema.projectAllocation.end_date} >= ${today}`,
          ),
        ),
      );

    // Step 2: hours logged by each member this week on PM's projects
    const hoursRows = await db
      .select({
        emp_id: schema.dailyProjectLogs.emp_id,
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
      .groupBy(schema.dailyProjectLogs.emp_id);

    // Map for quick lookup
    const hoursByEmpId: Record<string, number> = {};
    hoursRows.forEach((r) => {
      hoursByEmpId[r.emp_id] = parseFloat(r.total_hours);
    });

    // Merge: include every team member, even those with 0 hours
    const merged = teamMembers
      .map((m) => ({
        emp_id: m.emp_id,
        name: m.full_name ?? m.emp_id,
        hours: hoursByEmpId[m.emp_id] ?? 0,
      }))
      .sort((a, b) => b.hours - a.hours);

    return NextResponse.json({
      data: merged,
      week: { start: weekStart, end: weekEnd },
    });
  } catch (error) {
    console.error("Error fetching PM team hours:", error);
    return ErrorResponses.internalError();
  }
}
