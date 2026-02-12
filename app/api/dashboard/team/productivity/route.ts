import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, gte, lte, inArray, or, isNull } from "drizzle-orm";
import {
  generateWeeklyBuckets,
  getDefaultReportRange,
  formatHours,
} from "@/lib/reporting-utils";

/**
 * GET /api/dashboard/team/productivity
 * Get team productivity by week
 * Query params: start_date, end_date, manager_id (optional, defaults to current user if PM)
 * Access: HR and PM only
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
    const managerId = searchParams.get("manager_id");

    // Default to last 8 weeks if not provided
    const defaultRange = getDefaultReportRange();
    const start = startDate || defaultRange.start;
    const end = endDate || defaultRange.end;

    // Determine which manager's team to show
    let targetManagerId = managerId;
    if (user.employee_role === "project_manager" && !managerId) {
      targetManagerId = user.id;
    }

    // Get team member IDs based on role
    let teamMemberIds: string[] = [];

    if (targetManagerId) {
      // Get employees working on this PM's projects
      const pmProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, targetManagerId));

      const projectIds = pmProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        const allocations = await db
          .select({ emp_id: schema.projectAllocation.emp_id })
          .from(schema.projectAllocation)
          .where(
            and(
              inArray(schema.projectAllocation.project_id, projectIds),
              or(
                isNull(schema.projectAllocation.end_date),
                gte(schema.projectAllocation.end_date, start),
              ),
            ),
          )
          .groupBy(schema.projectAllocation.emp_id);

        teamMemberIds = allocations.map((a) => a.emp_id);
      }
    } else if (user.employee_role === "hr_executive") {
      // HR sees all employees
      const allEmployees = await db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(eq(schema.employees.status, "ACTIVE"));

      teamMemberIds = allEmployees.map((e) => e.id);
    }

    if (teamMemberIds.length === 0) {
      return successResponse({
        start_date: start,
        end_date: end,
        weekly_data: [],
      });
    }

    // Generate weekly buckets using utility function
    const weeklyBuckets = generateWeeklyBuckets(start, end);

    // Fetch data for each week
    const weeklyData = await Promise.all(
      weeklyBuckets.map(async (week) => {
        const weekData = await db
          .select({
            emp_id: schema.employees.id,
            employee_code: schema.employees.employee_code,
            full_name: schema.employees.full_name,
            total_hours: sql<number>`
              COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
            `,
            billable_hours: sql<number>`
              COALESCE(
                SUM(
                  CASE 
                    WHEN ${schema.projectAllocation.billability} = true 
                    THEN ${schema.dailyProjectLogs.hours}::numeric
                    ELSE 0 
                  END
                ), 
                0
              )
            `,
            projects_count: sql<number>`
              COUNT(DISTINCT ${schema.dailyProjectLogs.project_id})
            `,
          })
          .from(schema.employees)
          .leftJoin(
            schema.dailyProjectLogs,
            and(
              eq(schema.employees.id, schema.dailyProjectLogs.emp_id),
              gte(schema.dailyProjectLogs.log_date, week.week_start),
              lte(schema.dailyProjectLogs.log_date, week.week_end),
            ),
          )
          .leftJoin(
            schema.projectAllocation,
            and(
              eq(
                schema.dailyProjectLogs.project_id,
                schema.projectAllocation.project_id,
              ),
              eq(
                schema.dailyProjectLogs.emp_id,
                schema.projectAllocation.emp_id,
              ),
            ),
          )
          .where(inArray(schema.employees.id, teamMemberIds))
          .groupBy(
            schema.employees.id,
            schema.employees.employee_code,
            schema.employees.full_name,
          );

        return {
          week_start: week.week_start,
          week_end: week.week_end,
          employees: weekData.map((emp) => ({
            emp_id: emp.emp_id,
            employee_code: emp.employee_code,
            full_name: emp.full_name,
            total_hours: formatHours(emp.total_hours),
            billable_hours: formatHours(emp.billable_hours),
            projects_count: emp.projects_count,
          })),
        };
      }),
    );

    return successResponse({
      start_date: start,
      end_date: end,
      weekly_data: weeklyData,
    });
  } catch (error) {
    console.error("Error fetching team productivity:", error);
    return ErrorResponses.internalError();
  }
}
