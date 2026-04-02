import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull } from "drizzle-orm";

// GET /api/analytics/project-employee-count
// Returns count of employees allocated to each project
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const today = new Date().toISOString().split("T")[0];

    // Get count of unique employees by project for active allocations
    const projectEmployeeCounts = await db
      .select({
        project_id: schema.projectAllocation.project_id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        employee_count: sql<number>`COUNT(DISTINCT ${schema.projectAllocation.emp_id})::int`,
      })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(
        and(
          sql`${schema.projectAllocation.start_date} <= ${today}`,
          or(
            isNull(schema.projectAllocation.end_date),
            sql`${schema.projectAllocation.end_date} >= ${today}`,
          ),
        ),
      )
      .groupBy(
        schema.projectAllocation.project_id,
        schema.projects.project_code,
        schema.projects.project_name,
      )
      .orderBy(sql`COUNT(DISTINCT ${schema.projectAllocation.emp_id}) DESC`);

    return NextResponse.json({
      data: projectEmployeeCounts.map((item) => ({
        project: `${item.project_code} - ${item.project_name}`,
        project_code: item.project_code,
        project_name: item.project_name,
        count: item.employee_count,
      })),
    });
  } catch (error) {
    console.error("Error fetching project employee count:", error);
    return ErrorResponses.internalError();
  }
}
