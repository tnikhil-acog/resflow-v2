import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

// GET /api/analytics/capacity-utilization
// Returns capacity utilization metrics: count of employees with UTILIZED status vs total employees
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Get count of unique employees with at least one UTILIZED allocation
    const utilizedEmployeesResult = await db
      .select({
        count: sql<string>`COUNT(DISTINCT ${schema.projectAllocation.emp_id})`,
      })
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.utilization, "UTILIZED"));

    const utilizedEmployeeCount = parseInt(
      utilizedEmployeesResult[0]?.count || "0",
    );

    // Get total active employees
    const totalEmployeesResult = await db
      .select({
        count: sql<string>`COUNT(*)`,
      })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));

    const totalEmployeeCount = parseInt(totalEmployeesResult[0]?.count || "0");

    // Calculate capacity utilization percentage
    const capacityUtilization =
      totalEmployeeCount > 0
        ? parseFloat(
            ((utilizedEmployeeCount / totalEmployeeCount) * 100).toFixed(2),
          )
        : 0;

    return NextResponse.json({
      utilizedEmployeeCount,
      totalEmployeeCount,
      capacityUtilization,
    });
  } catch (error) {
    console.error("Error fetching capacity utilization:", error);
    return ErrorResponses.internalError();
  }
}
