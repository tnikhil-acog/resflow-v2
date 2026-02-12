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
 * GET /api/reports/monthly
 * Get monthly consolidated work reports
 * Query params: month (1-12), year, project_id (optional), emp_id (optional)
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
    const empId = searchParams.get("emp_id");

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
          records: [],
        });
      }
      whereConditions.push(
        inArray(schema.dailyProjectLogs.project_id, projectIds),
      );
    }

    // Apply optional filters
    if (projectId && projectId !== "ALL") {
      whereConditions.push(eq(schema.dailyProjectLogs.project_id, projectId));
    }

    if (empId && empId !== "ALL") {
      whereConditions.push(eq(schema.dailyProjectLogs.emp_id, empId));
    }

    // Query monthly consolidated data
    const monthlyData = await db
      .select({
        emp_id: schema.employees.id,
        employee_code: schema.employees.employee_code,
        full_name: schema.employees.full_name,
        project_id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        total_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
        `,
        billability: schema.projectAllocation.billability,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.employees,
        eq(schema.dailyProjectLogs.emp_id, schema.employees.id),
      )
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .innerJoin(
        schema.projectAllocation,
        and(
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
        ),
      )
      .where(and(...whereConditions))
      .groupBy(
        schema.employees.id,
        schema.employees.employee_code,
        schema.employees.full_name,
        schema.projects.id,
        schema.projects.project_code,
        schema.projects.project_name,
        schema.projectAllocation.billability,
      )
      .orderBy(schema.employees.employee_code, schema.projects.project_code);

    return successResponse({
      month,
      year,
      records: monthlyData.map((record) => ({
        emp_id: record.emp_id,
        employee_code: record.employee_code,
        full_name: record.full_name,
        project_id: record.project_id,
        project_code: record.project_code,
        project_name: record.project_name,
        total_hours: formatHours(record.total_hours),
        billability: record.billability,
      })),
    });
  } catch (error) {
    console.error("Error fetching monthly reports:", error);
    return ErrorResponses.internalError();
  }
}
