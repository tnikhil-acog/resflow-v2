import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull } from "drizzle-orm";

// GET /api/analytics/project-allocations
// Returns total allocation percentage grouped by project type and individual projects
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const today = new Date().toISOString().split("T")[0];

    // Get sum of allocation percentages by project for active allocations
    const projectAllocations = await db
      .select({
        project_id: schema.projectAllocation.project_id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
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
      .groupBy(
        schema.projectAllocation.project_id,
        schema.projects.project_code,
        schema.projects.project_name,
        schema.projects.project_type,
      )
      .orderBy(
        sql`SUM(${schema.projectAllocation.allocation_percentage}) DESC`,
      );

    // Group by project type
    const groupedByType: Record<
      string,
      {
        type: string;
        total: number;
        projects: Array<{
          project: string;
          project_name: string;
          allocation: number;
        }>;
      }
    > = {};

    projectAllocations.forEach((item) => {
      const type = item.project_type || "Other";
      const allocation = parseFloat(item.total_allocation || "0");

      if (!groupedByType[type]) {
        groupedByType[type] = {
          type,
          total: 0,
          projects: [],
        };
      }

      groupedByType[type].total += allocation;
      groupedByType[type].projects.push({
        project: item.project_code || "Unknown",
        project_name: item.project_name || "Unknown Project",
        allocation,
      });
    });

    // Convert to array and sort by total allocation
    const data = Object.values(groupedByType).sort((a, b) => b.total - a.total);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error fetching project allocations:", error);
    return ErrorResponses.internalError();
  }
}
