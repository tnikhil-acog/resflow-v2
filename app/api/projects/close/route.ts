// POST /api/projects/close
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, status, closed_on }
// Validate: status must be 'COMPLETED' or 'CANCELLED', else return 400 "status must be COMPLETED or CANCELLED"
// Check for active allocations: SELECT COUNT(*) FROM project_allocation WHERE project_id = ? AND end_date > closed_on
// If count > 0, return 400 "Project has active allocations with end_date after closed_on"
// UPDATE projects SET status = ?, closed_on = ? WHERE id = ?
// End allocations: UPDATE project_allocation SET end_date = closed_on WHERE project_id = ? AND end_date > closed_on
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, status, closed_on, allocations_ended: count }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import { getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, gt } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, status, closed_on } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "id",
      "status",
      "closed_on",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate status
    if (status !== "COMPLETED" && status !== "CANCELLED") {
      return ErrorResponses.badRequest("status must be COMPLETED or CANCELLED");
    }

    // Get project
    const [project] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id));

    if (!project) {
      return ErrorResponses.notFound("Project");
    }

    const closedOnStr = toDateString(closed_on)!;

    // Check for active allocations after close date
    const activeAllocationsCount = await getCount(
      schema.projectAllocation,
      and(
        eq(schema.projectAllocation.project_id, id),
        gt(schema.projectAllocation.end_date, closedOnStr),
      ),
    );

    if (activeAllocationsCount > 0) {
      return ErrorResponses.badRequest(
        "Project has active allocations with end_date after closed_on",
      );
    }

    // Use transaction to update project and end allocations
    const result = await db.transaction(async (tx) => {
      // Update project status
      const [updated] = await tx
        .update(schema.projects)
        .set({
          status: status as any,
          closed_on: closedOnStr,
          updated_at: new Date(),
        })
        .where(eq(schema.projects.id, id))
        .returning();

      // End allocations where end_date > closed_on
      const endedAllocations = await tx
        .update(schema.projectAllocation)
        .set({
          end_date: closedOnStr,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(schema.projectAllocation.project_id, id),
            gt(schema.projectAllocation.end_date, closedOnStr),
          ),
        )
        .returning();

      return {
        project: updated,
        allocations_ended: endedAllocations.length,
      };
    });

    await createAuditLog({
      entity_type: "PROJECT",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        status,
        closed_on: closedOnStr,
        allocations_ended: result.allocations_ended,
      },
    });

    return successResponse({
      id: result.project.id,
      project_code: result.project.project_code,
      status: result.project.status,
      closed_on: result.project.closed_on,
      allocations_ended: result.allocations_ended,
    });
  } catch (error) {
    console.error("Error closing project:", error);
    return ErrorResponses.internalError();
  }
}
