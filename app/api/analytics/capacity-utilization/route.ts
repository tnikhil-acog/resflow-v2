import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

// GET /api/analytics/capacity-utilization
// Returns capacity utilization metrics based on utilized allocation percentages
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // SUMIFS equivalent: sum allocation percentage where Utilization = UTILIZED
    const utilizedAllocationResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.projectAllocation.allocation_percentage}), 0)`,
      })
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.utilization, "UTILIZED"));

    const utilizedEmployeeCount = parseFloat(
      utilizedAllocationResult[0]?.total || "0",
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
            (utilizedEmployeeCount / totalEmployeeCount).toFixed(2),
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
