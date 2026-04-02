import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql } from "drizzle-orm";

// GET /api/analytics/economic-utilization
// Returns economic utilization metrics: billable employees vs total employees
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Get all billable employees (distinct employees working on economically billable projects)
    const billableEmployeesResult = await db
      .selectDistinct({
        emp_id: schema.projectAllocation.emp_id,
      })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(eq(schema.projects.economic_billability, true));

    const billableEmployeeIds = new Set(
      billableEmployeesResult.map((r) => r.emp_id).filter(Boolean),
    );
    const billableEmployeeCount = billableEmployeeIds.size;

    // Get total active employees
    const totalEmployeesResult = await db
      .select({
        count: sql<string>`COUNT(*)`,
      })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));

    const totalEmployeeCount = parseInt(totalEmployeesResult[0]?.count || "0");

    // Calculate percentage
    const economicUtilization =
      totalEmployeeCount > 0
        ? parseFloat(
            ((billableEmployeeCount / totalEmployeeCount) * 100).toFixed(2),
          )
        : 0;

    return NextResponse.json({
      billableEmployeeCount,
      totalEmployeeCount,
      economicUtilization,
    });
  } catch (error) {
    console.error("Error fetching economic utilization:", error);
    return ErrorResponses.internalError();
  }
}
