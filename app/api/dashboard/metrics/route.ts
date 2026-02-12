import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, gte, lte, ne, inArray } from "drizzle-orm";

/**
 * GET /api/dashboard/metrics
 * Get dashboard metrics for the current user based on their role
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Get current date and week boundaries
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)

    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Initialize metrics
    let pendingTasks = 0;
    let completedTasks = 0;
    let activeProjects = 0;
    let missingReports = 0;
    let recentTasks: any[] = [];
    let weeklyHours = 0;
    let totalEmployees = 0;
    let teamMembers = 0;
    let pendingApprovals = 0;

    // Role-based data fetching
    if (user.employee_role === "employee") {
      // Employee dashboard

      // Pending tasks assigned to this employee
      const pendingTasksResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.owner_id, user.id),
            eq(schema.tasks.status, "DUE"),
            sql`${schema.tasks.due_on} IS NOT NULL`,
          ),
        );
      pendingTasks = pendingTasksResult[0]?.count || 0;

      // Completed tasks
      const completedTasksResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.owner_id, user.id),
            eq(schema.tasks.status, "COMPLETED"),
          ),
        );
      completedTasks = completedTasksResult[0]?.count || 0;

      // Active projects this employee is allocated to (current allocations only)
      const activeProjectsResult = await db
        .select({
          count: sql<number>`cast(count(DISTINCT ${schema.projectAllocation.project_id}) as integer)`,
        })
        .from(schema.projectAllocation)
        .innerJoin(
          schema.projects,
          eq(schema.projectAllocation.project_id, schema.projects.id),
        )
        .where(
          and(
            eq(schema.projectAllocation.emp_id, user.id),
            ne(schema.projects.status, "COMPLETED"),
            ne(schema.projects.status, "CANCELLED"),
            // Only count current allocations (no end_date or end_date in future)
            sql`(${schema.projectAllocation.end_date} IS NULL OR ${schema.projectAllocation.end_date} >= CURRENT_DATE)`,
          ),
        );
      activeProjects = activeProjectsResult[0]?.count || 0;

      // Check for missing weekly report
      const reportExists = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.reports)
        .where(
          and(
            eq(schema.reports.emp_id, user.id),
            eq(schema.reports.report_type, "WEEKLY"),
            gte(
              schema.reports.week_start_date,
              weekStart.toISOString().split("T")[0],
            ),
            lte(
              schema.reports.week_end_date,
              weekEnd.toISOString().split("T")[0],
            ),
          ),
        );
      missingReports = reportExists[0]?.count === 0 ? 1 : 0;

      // Get recent tasks (next 7 days)
      recentTasks = await db
        .select({
          id: schema.tasks.id,
          description: schema.tasks.description,
          due_on: schema.tasks.due_on,
          status: schema.tasks.status,
          entity_type: schema.tasks.entity_type,
          entity_id: schema.tasks.entity_id,
          project_name: schema.projects.project_name,
        })
        .from(schema.tasks)
        .leftJoin(
          schema.projects,
          and(
            eq(schema.tasks.entity_type, "PROJECT"),
            eq(schema.tasks.entity_id, schema.projects.id),
          ),
        )
        .where(
          and(
            eq(schema.tasks.owner_id, user.id),
            lte(
              schema.tasks.due_on,
              sevenDaysFromNow.toISOString().split("T")[0],
            ),
          ),
        )
        .orderBy(schema.tasks.due_on)
        .limit(10);

      // Get weekly hours logged
      const weeklyHoursResult = await db
        .select({
          total: sql<number>`cast(sum(${schema.dailyProjectLogs.hours}) as decimal)`,
        })
        .from(schema.dailyProjectLogs)
        .where(
          and(
            eq(schema.dailyProjectLogs.emp_id, user.id),
            gte(
              schema.dailyProjectLogs.log_date,
              weekStart.toISOString().split("T")[0],
            ),
            lte(
              schema.dailyProjectLogs.log_date,
              weekEnd.toISOString().split("T")[0],
            ),
          ),
        );
      weeklyHours = Number(weeklyHoursResult[0]?.total ?? 0);
    } else if (user.employee_role === "project_manager") {
      // Project Manager dashboard

      // Get all projects managed by this PM
      const managedProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      const projectIds = managedProjects.map((p) => p.id);

      // Get team member IDs from project allocations
      let teamMemberIds: string[] = [];
      if (projectIds.length > 0) {
        const teamMembers = await db
          .select({ emp_id: schema.projectAllocation.emp_id })
          .from(schema.projectAllocation)
          .where(inArray(schema.projectAllocation.project_id, projectIds));
        teamMemberIds = [...new Set(teamMembers.map((m) => m.emp_id))];
      }

      // Set team members count for PM
      teamMembers = teamMemberIds.length;

      // Pending tasks for team
      if (teamMemberIds.length > 0) {
        const pendingTasksResult = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(schema.tasks)
          .where(
            and(
              inArray(schema.tasks.owner_id, teamMemberIds),
              eq(schema.tasks.status, "DUE"),
              sql`${schema.tasks.due_on} IS NOT NULL`,
            ),
          );
        pendingTasks = pendingTasksResult[0]?.count || 0;

        // Completed tasks
        const completedTasksResult = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(schema.tasks)
          .where(
            and(
              inArray(schema.tasks.owner_id, teamMemberIds),
              eq(schema.tasks.status, "COMPLETED"),
            ),
          );
        completedTasks = completedTasksResult[0]?.count || 0;
      }

      // Active projects managed by this PM
      const activeProjectsResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.project_manager_id, user.id),
            ne(schema.projects.status, "COMPLETED"),
            ne(schema.projects.status, "CANCELLED"),
          ),
        );
      activeProjects = activeProjectsResult[0]?.count || 0;

      // Missing reports from team members
      if (teamMemberIds.length > 0) {
        const reportedMembers = await db
          .select({ emp_id: schema.reports.emp_id })
          .from(schema.reports)
          .where(
            and(
              inArray(schema.reports.emp_id, teamMemberIds),
              eq(schema.reports.report_type, "WEEKLY"),
              gte(
                schema.reports.week_start_date,
                weekStart.toISOString().split("T")[0],
              ),
              lte(
                schema.reports.week_end_date,
                weekEnd.toISOString().split("T")[0],
              ),
            ),
          );

        missingReports = teamMemberIds.length - reportedMembers.length;
      }

      // Get recent tasks from team
      if (teamMemberIds.length > 0) {
        recentTasks = await db
          .select({
            id: schema.tasks.id,
            description: schema.tasks.description,
            due_on: schema.tasks.due_on,
            status: schema.tasks.status,
            owner_id: schema.tasks.owner_id,
            owner_name: schema.employees.full_name,
            entity_type: schema.tasks.entity_type,
            entity_id: schema.tasks.entity_id,
            project_name: schema.projects.project_name,
          })
          .from(schema.tasks)
          .innerJoin(
            schema.employees,
            eq(schema.tasks.owner_id, schema.employees.id),
          )
          .leftJoin(
            schema.projects,
            and(
              eq(schema.tasks.entity_type, "PROJECT"),
              eq(schema.tasks.entity_id, schema.projects.id),
            ),
          )
          .where(
            and(
              inArray(schema.tasks.owner_id, teamMemberIds),
              lte(
                schema.tasks.due_on,
                sevenDaysFromNow.toISOString().split("T")[0],
              ),
            ),
          )
          .orderBy(schema.tasks.due_on)
          .limit(10);
      }
    } else if (user.employee_role === "hr_executive") {
      // HR Executive dashboard - company-wide metrics

      // All pending tasks
      const pendingTasksResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.status, "DUE"),
            sql`${schema.tasks.due_on} IS NOT NULL`,
          ),
        );
      pendingTasks = pendingTasksResult[0]?.count || 0;

      // All completed tasks
      const completedTasksResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.tasks)
        .where(eq(schema.tasks.status, "COMPLETED"));
      completedTasks = completedTasksResult[0]?.count || 0;

      // All active projects
      const activeProjectsResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.projects)
        .where(
          and(
            ne(schema.projects.status, "COMPLETED"),
            ne(schema.projects.status, "CANCELLED"),
          ),
        );
      activeProjects = activeProjectsResult[0]?.count || 0;

      // All employees count
      const allEmployeesResult = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(schema.employees)
        .where(eq(schema.employees.status, "ACTIVE"));
      totalEmployees = allEmployeesResult[0]?.count || 0;

      // Employees who submitted reports this week
      const reportedEmployeesResult = await db
        .select({
          count: sql<number>`cast(count(DISTINCT ${schema.reports.emp_id}) as integer)`,
        })
        .from(schema.reports)
        .where(
          and(
            eq(schema.reports.report_type, "WEEKLY"),
            gte(
              schema.reports.week_start_date,
              weekStart.toISOString().split("T")[0],
            ),
            lte(
              schema.reports.week_end_date,
              weekEnd.toISOString().split("T")[0],
            ),
          ),
        );
      const reportedCount = reportedEmployeesResult[0]?.count || 0;
      missingReports = totalEmployees - reportedCount;

      // Get recent tasks across company
      recentTasks = await db
        .select({
          id: schema.tasks.id,
          description: schema.tasks.description,
          due_on: schema.tasks.due_on,
          status: schema.tasks.status,
          owner_id: schema.tasks.owner_id,
          owner_name: schema.employees.full_name,
          entity_type: schema.tasks.entity_type,
          entity_id: schema.tasks.entity_id,
          project_name: schema.projects.project_name,
        })
        .from(schema.tasks)
        .innerJoin(
          schema.employees,
          eq(schema.tasks.owner_id, schema.employees.id),
        )
        .leftJoin(
          schema.projects,
          and(
            eq(schema.tasks.entity_type, "PROJECT"),
            eq(schema.tasks.entity_id, schema.projects.id),
          ),
        )
        .where(
          lte(
            schema.tasks.due_on,
            sevenDaysFromNow.toISOString().split("T")[0],
          ),
        )
        .orderBy(schema.tasks.due_on)
        .limit(10);
    }

    return successResponse({
      metrics: {
        pendingTasks,
        completedTasks,
        activeProjects,
        missingReports,
        weeklyHours,
        totalEmployees,
        teamMembers,
        pendingApprovals,
      },
      tasks: recentTasks,
      weekPeriod: {
        start: weekStart.toISOString().split("T")[0],
        end: weekEnd.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    return ErrorResponses.internalError();
  }
}
