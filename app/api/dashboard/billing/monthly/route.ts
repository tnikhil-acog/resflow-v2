import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  getCurrentMonthYear,
  isValidMonth,
  isValidYear,
  formatHours,
} from "@/lib/reporting-utils";

/**
 * GET /api/dashboard/billing/monthly
 * Get monthly billing hours by project
 * Query params: month (1-12), year, project_id (optional)
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
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const projectId = searchParams.get("project_id");

    // Default to current month/year if not provided
    const current = getCurrentMonthYear();
    const month = monthParam ? parseInt(monthParam) : current.month;
    const year = yearParam ? parseInt(yearParam) : current.year;

    // Validate month and year
    if (!isValidMonth(month)) {
      return ErrorResponses.badRequest("Invalid month. Must be between 1-12.");
    }

    if (!isValidYear(year)) {
      return ErrorResponses.badRequest("Invalid year.");
    }

    // Build where conditions
    const whereConditions = [
      sql`EXTRACT(MONTH FROM ${schema.dailyProjectLogs.log_date}) = ${month}`,
      sql`EXTRACT(YEAR FROM ${schema.dailyProjectLogs.log_date}) = ${year}`,
      eq(schema.projectAllocation.billability, true), // Only billable hours
    ];

    // If PM, filter to only their projects
    if (user.employee_role === "project_manager") {
      const pmProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      const projectIds = pmProjects.map((p) => p.id);
      if (projectIds.length === 0) {
        return successResponse({
          month,
          year,
          projects: [],
          total_billable_hours: 0,
        });
      }
      whereConditions.push(inArray(schema.projects.id, projectIds));
    }

    // If specific project requested
    if (projectId && projectId !== "ALL") {
      whereConditions.push(eq(schema.projects.id, projectId));
    }

    // Query monthly billing by project
    const billingData = await db
      .select({
        project_id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        total_billable_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
        `,
        total_employees: sql<number>`
          COUNT(DISTINCT ${schema.dailyProjectLogs.emp_id})
        `,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
        ),
      )
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .where(and(...whereConditions))
      .groupBy(
        schema.projects.id,
        schema.projects.project_code,
        schema.projects.project_name,
      )
      .orderBy(schema.projects.project_code);

    // Calculate total
    const totalBillableHours = billingData.reduce(
      (sum, project) => sum + formatHours(project.total_billable_hours),
      0,
    );

    return successResponse({
      month,
      year,
      projects: billingData.map((p) => ({
        project_id: p.project_id,
        project_code: p.project_code,
        project_name: p.project_name,
        total_billable_hours: formatHours(p.total_billable_hours),
        total_employees: p.total_employees,
      })),
      total_billable_hours: formatHours(totalBillableHours),
    });
  } catch (error) {
    console.error("Error fetching monthly billing:", error);
    return ErrorResponses.internalError();
  }
}
