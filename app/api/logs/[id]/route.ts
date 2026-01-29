import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

// GET /api/logs/[id] - Get single log
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await params;

    // Get log with project details
    const [log] = await db
      .select({
        id: schema.dailyProjectLogs.id,
        emp_id: schema.dailyProjectLogs.emp_id,
        project_id: schema.dailyProjectLogs.project_id,
        log_date: schema.dailyProjectLogs.log_date,
        hours: schema.dailyProjectLogs.hours,
        notes: schema.dailyProjectLogs.notes,
        locked: schema.dailyProjectLogs.locked,
        created_at: schema.dailyProjectLogs.created_at,
        project: {
          id: schema.projects.id,
          project_code: schema.projects.project_code,
          project_name: schema.projects.project_name,
        },
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .where(eq(schema.dailyProjectLogs.id, id));

    if (!log) {
      return ErrorResponses.notFound("Log");
    }

    // Check access
    if (
      !checkRole(user, ["hr_executive", "project_manager"]) &&
      log.emp_id !== user.id
    ) {
      return ErrorResponses.accessDenied();
    }

    return successResponse(log);
  } catch (error) {
    console.error("Error fetching log:", error);
    return ErrorResponses.internalError();
  }
}

// PUT /api/logs/[id] - Update log
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await params;

    const body = await req.json();
    const { hours, notes } = body;

    // Get log
    const [log] = await db
      .select()
      .from(schema.dailyProjectLogs)
      .where(eq(schema.dailyProjectLogs.id, id));

    if (!log) {
      return ErrorResponses.notFound("Log");
    }

    // Check ownership
    if (log.emp_id !== user.id && !checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Check if locked
    if (log.locked) {
      return ErrorResponses.badRequest("Cannot modify locked logs");
    }

    // Validate hours if provided
    if (hours !== undefined) {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 24) {
        return ErrorResponses.badRequest(
          "hours must be a positive number between 0 and 24",
        );
      }
    }

    // Update log
    const updateData: any = {};
    if (hours !== undefined) updateData.hours = hours.toString();
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(schema.dailyProjectLogs)
      .set(updateData)
      .where(eq(schema.dailyProjectLogs.id, id))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "DAILY_PROJECT_LOG",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: updateData,
    });

    return successResponse({
      id: updated.id,
      hours: updated.hours,
      notes: updated.notes,
      locked: updated.locked,
    });
  } catch (error) {
    console.error("Error updating log:", error);
    return ErrorResponses.internalError();
  }
}

// DELETE /api/logs/[id] - Delete log
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await params;

    // Get log
    const [log] = await db
      .select()
      .from(schema.dailyProjectLogs)
      .where(eq(schema.dailyProjectLogs.id, id));

    if (!log) {
      return ErrorResponses.notFound("Log");
    }

    // Check ownership
    if (log.emp_id !== user.id && !checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Check if locked
    if (log.locked) {
      return ErrorResponses.badRequest(
        "Cannot delete locked logs (already submitted in a report)",
      );
    }

    // Delete log
    await db
      .delete(schema.dailyProjectLogs)
      .where(eq(schema.dailyProjectLogs.id, id));

    // Create audit log
    await createAuditLog({
      entity_type: "DAILY_PROJECT_LOG",
      entity_id: id,
      operation: "DELETE",
      changed_by: user.id,
      changed_fields: { deleted: true },
    });

    return successResponse({ message: "Log deleted successfully" });
  } catch (error) {
    console.error("Error deleting log:", error);
    return ErrorResponses.internalError();
  }
}
