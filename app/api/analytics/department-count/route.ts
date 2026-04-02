import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql } from "drizzle-orm";

// GET /api/analytics/department-count
// Returns count of employees grouped by department
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Get count of active employees by department
    const departmentCounts = await db
      .select({
        department_id: schema.employees.department_id,
        department_name: schema.departments.name,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.department_id, schema.departments.id),
      )
      .where(eq(schema.employees.status, "ACTIVE"))
      .groupBy(schema.employees.department_id, schema.departments.name)
      .orderBy(sql`COUNT(*) DESC`);

    return NextResponse.json({
      data: departmentCounts.map((item) => ({
        department: item.department_name || "Unassigned",
        count: item.count,
      })),
    });
  } catch (error) {
    console.error("Error fetching department count:", error);
    return ErrorResponses.internalError();
  }
}
