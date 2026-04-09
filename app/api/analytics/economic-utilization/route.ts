import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

// GET /api/analytics/economic-utilization
// Returns economic utilization metrics based on billable allocation percentages
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // SUMIFS equivalent: sum allocation percentage where Billability = BILLABLE
    const billableAllocationResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(${schema.projectAllocation.allocation_percentage}), 0)`,
      })
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.billability, true));

    const billableEmployeeCount = parseFloat(
      billableAllocationResult[0]?.total || "0",
    );

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
            (billableEmployeeCount / totalEmployeeCount).toFixed(2),
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
