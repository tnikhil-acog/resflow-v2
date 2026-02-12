import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, isNotNull, isNull, or } from "drizzle-orm";

/**
 * GET /api/dashboard/projects/classification
 * Get project counts by classification (client vs internal)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR and PM can access this endpoint
    if (
      user.employee_role !== "hr_executive" &&
      user.employee_role !== "project_manager"
    ) {
      return ErrorResponses.accessDenied();
    }

    // Count client projects: project_type = 'C' OR client_id IS NOT NULL
    const clientProjectsResult = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(schema.projects)
      .where(
        and(
          or(
            eq(schema.projects.project_type, "C"),
            isNotNull(schema.projects.client_id),
          ),
          eq(schema.projects.status, "ACTIVE"),
        ),
      );

    // Count internal projects: project_type != 'C' AND client_id IS NULL
    const internalProjectsResult = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(schema.projects)
      .where(
        and(
          or(
            sql`${schema.projects.project_type} != 'C'`,
            isNull(schema.projects.project_type),
          ),
          isNull(schema.projects.client_id),
          eq(schema.projects.status, "ACTIVE"),
        ),
      );

    // Count total active projects
    const totalActiveResult = await db
      .select({
        count: sql<number>`cast(count(*) as integer)`,
      })
      .from(schema.projects)
      .where(eq(schema.projects.status, "ACTIVE"));

    return successResponse({
      client_projects: clientProjectsResult[0]?.count || 0,
      internal_projects: internalProjectsResult[0]?.count || 0,
      total_active: totalActiveResult[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching project classification:", error);
    return ErrorResponses.internalError();
  }
}
