import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";

/**
 * GET /api/dashboard/hours/billable
 * Calculate billable and non-billable hours for a given period
 * Query params: start_date, end_date, emp_id, department_id, project_id, emp_type
 * Role-based access: HR sees all, PM sees only their projects' employees
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const empId = searchParams.get("emp_id");
    const departmentId = searchParams.get("department_id");
    const projectId = searchParams.get("project_id");
    const empType = searchParams.get("emp_type");

    // Default to current week if no dates provided
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const start = startDate || weekStart.toISOString().split("T")[0];
    const end = endDate || weekEnd.toISOString().split("T")[0];

    // Build where conditions
    const whereConditions = [
      gte(schema.dailyProjectLogs.log_date, start),
      lte(schema.dailyProjectLogs.log_date, end),
    ];

    // Role-based filtering for PM: only see employees in their managed projects
    if (user.employee_role === "project_manager") {
      const pmProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      const projectIds = pmProjects.map((p) => p.id);
      if (projectIds.length > 0) {
        whereConditions.push(
          inArray(schema.dailyProjectLogs.project_id, projectIds),
        );
      } else {
        // PM has no projects, return empty result
        return successResponse({
          billable_hours: 0,
          non_billable_hours: 0,
          total_hours: 0,
          period: { start, end },
        });
      }
    }

    // Apply filters (only for HR and PM)
    if (
      user.employee_role === "hr_executive" ||
      user.employee_role === "project_manager"
    ) {
      if (empId && empId !== "ALL") {
        whereConditions.push(eq(schema.dailyProjectLogs.emp_id, empId));
      }
      if (projectId && projectId !== "ALL") {
        whereConditions.push(eq(schema.dailyProjectLogs.project_id, projectId));
      }
      if (departmentId && departmentId !== "ALL") {
        whereConditions.push(eq(schema.employees.department_id, departmentId));
      }
      if (
        empType &&
        empType !== "ALL" &&
        (empType === "FTE" || empType === "INTERN" || empType === "Trainee")
      ) {
        whereConditions.push(
          eq(
            schema.employees.employee_type,
            empType as "FTE" | "INTERN" | "Trainee",
          ),
        );
      }
    } else {
      // Regular employees can only see their own data
      whereConditions.push(eq(schema.dailyProjectLogs.emp_id, user.id));
    }

    // Calculate billable and non-billable hours
    const hoursResult = await db
      .select({
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
        non_billable_hours: sql<number>`
          COALESCE(
            SUM(
              CASE 
                WHEN ${schema.projectAllocation.billability} = false 
                THEN ${schema.dailyProjectLogs.hours}::numeric
                ELSE 0 
              END
            ), 
            0
          )
        `,
        total_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
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
        schema.employees,
        eq(schema.dailyProjectLogs.emp_id, schema.employees.id),
      )
      .where(and(...whereConditions));

    const result = hoursResult[0] || {
      billable_hours: 0,
      non_billable_hours: 0,
      total_hours: 0,
    };

    return successResponse({
      billable_hours: parseFloat(result.billable_hours.toString()) || 0,
      non_billable_hours: parseFloat(result.non_billable_hours.toString()) || 0,
      total_hours: parseFloat(result.total_hours.toString()) || 0,
      period: {
        start,
        end,
      },
    });
  } catch (error) {
    console.error("Error fetching billable hours:", error);
    return ErrorResponses.internalError();
  }
}
