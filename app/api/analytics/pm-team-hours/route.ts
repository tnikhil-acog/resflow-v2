import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, inArray } from "drizzle-orm";

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
    const managedProjects = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.project_manager_id, user.id));

    let scopedEmpIds: string[] = [];

    if (managedProjects.length > 0) {
      const managedProjectIds = managedProjects.map((p) => p.id);
      const teamMembers = await db
        .selectDistinct({ emp_id: schema.projectAllocation.emp_id })
        .from(schema.projectAllocation)
        .where(inArray(schema.projectAllocation.project_id, managedProjectIds));
      scopedEmpIds = teamMembers.map((m) => m.emp_id);
    } else {
      const reportees = await db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(eq(schema.employees.reporting_manager_id, user.id));
      scopedEmpIds = reportees.map((r) => r.id);
    }

    const visibleEmpIds = [...new Set(scopedEmpIds)];

    if (visibleEmpIds.length === 0) {
      return NextResponse.json({
        data: [],
        week: { start: weekStart, end: weekEnd },
      });
    }

    // Step 1: visible members = project team members + direct reports
    const teamMembers = await db
      .select({
        id: schema.employees.id,
        full_name: schema.employees.full_name,
      })
      .from(schema.employees)
      .where(inArray(schema.employees.id, visibleEmpIds));

    // Step 2: hours logged by visible members this week
    const hoursRows = await db
      .select({
        emp_id: schema.dailyProjectLogs.emp_id,
        total_hours: sql<string>`COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)`,
      })
      .from(schema.dailyProjectLogs)
      .where(
        and(
          inArray(schema.dailyProjectLogs.emp_id, visibleEmpIds),
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
        emp_id: m.id,
        name: m.full_name ?? m.id,
        hours: hoursByEmpId[m.id] ?? 0,
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
