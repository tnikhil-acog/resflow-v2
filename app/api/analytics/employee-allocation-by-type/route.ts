import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull } from "drizzle-orm";

// GET /api/analytics/employee-allocation-by-type
// Returns unique employee count and allocation by project type and individual projects
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const today = new Date().toISOString().split("T")[0];

    // Get employee allocations by project for active allocations
    const employeeAllocations = await db
      .select({
        project_id: schema.projectAllocation.project_id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        project_type: schema.projects.project_type,
        employee_id: schema.projectAllocation.emp_id,
        employee_name: schema.employees.full_name,
        allocation_percentage: schema.projectAllocation.allocation_percentage,
      })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .leftJoin(
        schema.employees,
        eq(schema.projectAllocation.emp_id, schema.employees.id),
      )
      .where(
        and(
          sql`${schema.projectAllocation.start_date} <= ${today}`,
          or(
            isNull(schema.projectAllocation.end_date),
            sql`${schema.projectAllocation.end_date} >= ${today}`,
          ),
        ),
      );

    // Group by project type
    const groupedByType: Record<
      string,
      {
        type: string;
        employeeCount: number;
        totalAllocation: number;
        uniqueEmployees: Set<string>;
        projects: Record<
          string,
          {
            project_code: string;
            project_name: string;
            employeeCount: number;
            totalAllocation: number;
            uniqueEmployees: Set<string>;
            employees: Array<{
              employee_id: string;
              employee_name: string;
              allocation_percentage: number;
            }>;
          }
        >;
      }
    > = {};

    employeeAllocations.forEach((item) => {
      const type = item.project_type || "Other";
      const projectKey = item.project_id || "unknown";
      const employeeId = item.employee_id || "unknown";
      const allocation = parseFloat(String(item.allocation_percentage || 0));

      // Initialize type if not exists
      if (!groupedByType[type]) {
        groupedByType[type] = {
          type,
          employeeCount: 0,
          totalAllocation: 0,
          uniqueEmployees: new Set<string>(),
          projects: {},
        };
      }

      // Add employee to type-level unique set
      groupedByType[type].uniqueEmployees.add(employeeId);
      groupedByType[type].totalAllocation += allocation;

      // Initialize project if not exists
      if (!groupedByType[type].projects[projectKey]) {
        groupedByType[type].projects[projectKey] = {
          project_code: item.project_code || "Unknown",
          project_name: item.project_name || "Unknown Project",
          employeeCount: 0,
          totalAllocation: 0,
          uniqueEmployees: new Set<string>(),
          employees: [],
        };
      }

      // Add employee to project-level unique set
      groupedByType[type].projects[projectKey].uniqueEmployees.add(employeeId);
      groupedByType[type].projects[projectKey].totalAllocation += allocation;

      // Add employee details to the project
      groupedByType[type].projects[projectKey].employees.push({
        employee_id: employeeId,
        employee_name: item.employee_name || "Unknown Employee",
        allocation_percentage: allocation,
      });
    });

    // Convert to array and calculate final counts
    const data = Object.values(groupedByType)
      .map((typeData) => ({
        type: typeData.type,
        employeeCount: typeData.uniqueEmployees.size,
        totalAllocation: parseFloat(typeData.totalAllocation.toFixed(2)),
        projects: Object.values(typeData.projects)
          .map((project) => ({
            project_code: project.project_code,
            project_name: project.project_name,
            employeeCount: project.uniqueEmployees.size,
            totalAllocation: parseFloat(project.totalAllocation.toFixed(2)),
            employees: project.employees.sort(
              (a, b) => b.allocation_percentage - a.allocation_percentage,
            ),
          }))
          .sort((a, b) => b.totalAllocation - a.totalAllocation),
      }))
      .sort((a, b) => b.totalAllocation - a.totalAllocation);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching employee allocation by type:", error);
    return ErrorResponses.internalError();
  }
}
