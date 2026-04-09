import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull } from "drizzle-orm";

// GET /api/analytics/allocation-by-project-type
// Returns percentage of total allocation grouped by project type
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const today = new Date().toISOString().split("T")[0];

    // Get sum of allocation percentages by project type for active allocations
    const allocationByType = await db
      .select({
        project_type: schema.projects.project_type,
        total_allocation: sql<string>`SUM(${schema.projectAllocation.allocation_percentage})`,
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
      .groupBy(schema.projects.project_type)
      .orderBy(
        sql`SUM(${schema.projectAllocation.allocation_percentage}) DESC`,
      );

    // Calculate total for percentage
    const totalAllocation = allocationByType.reduce(
      (sum, item) => sum + parseFloat(item.total_allocation || "0"),
      0,
    );

    return NextResponse.json({
      data: allocationByType.map((item) => ({
        project_type: item.project_type || "Unknown",
        allocation: parseFloat(item.total_allocation || "0"),
        percentage:
          totalAllocation > 0
            ? (
                (parseFloat(item.total_allocation || "0") / totalAllocation) *
                100
              ).toFixed(1)
            : "0",
      })),
      total: totalAllocation,
    });
  } catch (error) {
    console.error("Error fetching allocation by project type:", error);
    return ErrorResponses.internalError();
  }
}
