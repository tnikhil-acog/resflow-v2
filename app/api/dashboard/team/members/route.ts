import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, gte, lte } from "drizzle-orm";

/**
 * GET /api/dashboard/team/members
 * Get detailed team member breakdown for a specific week
 * Query params: week_start (required), manager_id (optional, defaults to current user if PM)
 * Access: PM and HR only
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only PM and HR can access
    if (
      user.employee_role !== "project_manager" &&
      user.employee_role !== "hr_executive"
    ) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const weekStartParam = searchParams.get("week_start");

    if (!weekStartParam) {
      return ErrorResponses.badRequest("week_start is required");
    }

    const weekStart = new Date(weekStartParam);

    // Calculate week end (Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Determine which employees to include
    let employeeIds: string[] = [];

    if (user.employee_role === "project_manager") {
      // PM sees only their team members (employees on their projects)
      const pmProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      if (pmProjects.length === 0) {
        return Response.json({
          team_members: [],
          team_total_hours: 0,
          team_billable_hours: 0,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        });
      }

      const projectIds = pmProjects.map((p) => p.id);

      const allocations = await db
        .select({ emp_id: schema.projectAllocation.emp_id })
        .from(schema.projectAllocation)
        .where(
          and(
            sql`${schema.projectAllocation.project_id} = ANY(${projectIds})`,
            sql`(${schema.projectAllocation.end_date} IS NULL OR ${schema.projectAllocation.end_date} >= ${weekStart})`,
            sql`${schema.projectAllocation.start_date} <= ${weekEnd}`,
          ),
        );

      employeeIds = [...new Set(allocations.map((a) => a.emp_id))];

      if (employeeIds.length === 0) {
        return Response.json({
          team_members: [],
          team_total_hours: 0,
          team_billable_hours: 0,
          week_start: weekStart.toISOString().split("T")[0],
          week_end: weekEnd.toISOString().split("T")[0],
        });
      }
    }
    // HR sees all active employees (no filtering needed)

    // Build the query
    let logsQuery = db
      .select({
        emp_id: schema.dailyProjectLogs.emp_id,
        employee_code: schema.employees.employee_code,
        full_name: schema.employees.full_name,
        total_hours: sql<number>`SUM(${schema.dailyProjectLogs.hours}::numeric)`,
        billable_hours: sql<number>`
          SUM(CASE 
            WHEN ${schema.projectAllocation.billability} = true 
            THEN ${schema.dailyProjectLogs.hours}::numeric 
            ELSE 0 
          END)
        `,
        non_billable_hours: sql<number>`
          SUM(CASE 
            WHEN ${schema.projectAllocation.billability} = false 
            THEN ${schema.dailyProjectLogs.hours}::numeric 
            ELSE 0 
          END)
        `,
        project_count: sql<number>`COUNT(DISTINCT ${schema.dailyProjectLogs.project_id})`,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.employees,
        eq(schema.dailyProjectLogs.emp_id, schema.employees.id),
      )
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
          gte(
            schema.dailyProjectLogs.log_date,
            weekStart.toISOString().split("T")[0],
          ),
          lte(
            schema.dailyProjectLogs.log_date,
            weekEnd.toISOString().split("T")[0],
          ),
          eq(schema.employees.status, "ACTIVE"),
          user.employee_role === "project_manager" && employeeIds.length > 0
            ? sql`${schema.dailyProjectLogs.emp_id} = ANY(${employeeIds})`
            : undefined,
        ),
      )
      .groupBy(
        schema.dailyProjectLogs.emp_id,
        schema.employees.employee_code,
        schema.employees.full_name,
      )
      .orderBy(schema.employees.employee_code);

    const teamData = await logsQuery;

    // Check timesheet submission status for each employee
    const teamMembers = await Promise.all(
      teamData.map(async (member) => {
        // Check if this employee has submitted their weekly report
        const [report] = await db
          .select({
            report_type: schema.reports.report_type,
            created_at: schema.reports.created_at,
          })
          .from(schema.reports)
          .where(
            and(
              eq(schema.reports.emp_id, member.emp_id),
              eq(
                schema.reports.week_start_date,
                weekStart.toISOString().split("T")[0],
              ),
            ),
          )
          .limit(1);

        return {
          emp_id: member.emp_id,
          employee_code: member.employee_code,
          full_name: member.full_name,
          total_hours: parseFloat(member.total_hours.toString()).toFixed(2),
          billable_hours: parseFloat(member.billable_hours.toString()).toFixed(
            2,
          ),
          non_billable_hours: parseFloat(
            member.non_billable_hours.toString(),
          ).toFixed(2),
          billable_percentage:
            member.total_hours > 0
              ? Math.round(
                  (parseFloat(member.billable_hours.toString()) /
                    parseFloat(member.total_hours.toString())) *
                    100,
                )
              : 0,
          project_count: member.project_count,
          timesheet_status: report ? "submitted" : "not_submitted",
          timesheet_submitted_on: report?.created_at || null,
        };
      }),
    );

    // Calculate team totals
    const teamTotalHours = teamMembers.reduce(
      (sum, m) => sum + parseFloat(m.total_hours),
      0,
    );
    const teamBillableHours = teamMembers.reduce(
      (sum, m) => sum + parseFloat(m.billable_hours),
      0,
    );

    return Response.json({
      team_members: teamMembers,
      team_total_hours: teamTotalHours.toFixed(2),
      team_billable_hours: teamBillableHours.toFixed(2),
      team_billable_percentage:
        teamTotalHours > 0
          ? Math.round((teamBillableHours / teamTotalHours) * 100)
          : 0,
      week_start: weekStart.toISOString().split("T")[0],
      week_end: weekEnd.toISOString().split("T")[0],
      total_team_members: teamMembers.length,
    });
  } catch (error) {
    console.error("Error fetching team member details:", error);
    return ErrorResponses.internalError();
  }
}
