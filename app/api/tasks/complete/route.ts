// PATCH /api/tasks/complete
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { id }
// Get task: SELECT owner_id, status FROM tasks WHERE id = ?
// Validation:
//   - employee/project_manager: Can complete WHERE owner_id = current_user_id, else return 403 "Not your task"
//   - hr_executive: Can complete any task
//   - status must be 'DUE', else return 400 "Task already completed"
// UPDATE tasks SET status = 'COMPLETED' WHERE id = ?
// INSERT audit log with operation='UPDATE', entity_type='TASK', changed_by=current_user_id
// Return: { id, status }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, ne } from "drizzle-orm";

export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const body = await req.json();
    const { id } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get task
    const [task] = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.id, id));

    if (!task) {
      return ErrorResponses.notFound("Task");
    }

    // Check if already completed
    if (task.status === "COMPLETED") {
      return ErrorResponses.badRequest("Task already completed");
    }

    // Check access based on role
    if (checkRole(user, ["employee", "project_manager"])) {
      // Employee/PM can only complete their own tasks
      if (task.owner_id !== user.id) {
        return ErrorResponses.badRequest("Not your task");
      }
    }
    // hr_executive can complete any task

    // Update task status
    const [updated] = await db
      .update(schema.tasks)
      .set({ status: "COMPLETED" })
      .where(eq(schema.tasks.id, id))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "TASK",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        status: "COMPLETED",
      },
    });

    // For shared task types (DEMAND, EMPLOYEE_SKILL), propagate completion to all
    // sibling tasks assigned to other HR executives for the same entity.
    // Individual task types (e.g. PROJECT_ALLOCATION) are NOT propagated.
    const SHARED_ENTITY_TYPES = ["DEMAND", "EMPLOYEE_SKILL"];
    let siblingTasksCompleted = 0;

    if (
      task.entity_type &&
      SHARED_ENTITY_TYPES.includes(task.entity_type) &&
      task.entity_id
    ) {
      // Find all other DUE tasks for the same entity
      const siblingTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.entity_type, task.entity_type),
            eq(schema.tasks.entity_id, task.entity_id),
            eq(schema.tasks.status, "DUE"),
            ne(schema.tasks.id, id),
          ),
        );

      if (siblingTasks.length > 0) {
        await db
          .update(schema.tasks)
          .set({ status: "COMPLETED" })
          .where(
            and(
              eq(schema.tasks.entity_type, task.entity_type),
              eq(schema.tasks.entity_id, task.entity_id),
              eq(schema.tasks.status, "DUE"),
              ne(schema.tasks.id, id),
            ),
          );

        // Create audit logs for sibling task completions
        for (const siblingTask of siblingTasks) {
          await createAuditLog({
            entity_type: "TASK",
            entity_id: siblingTask.id,
            operation: "UPDATE",
            changed_by: user.id,
            changed_fields: {
              status: "COMPLETED",
              completion_reason: `Auto-completed when task ${id} was marked done`,
            },
          });
        }
        siblingTasksCompleted = siblingTasks.length;
      }
    }

    return successResponse({
      id: updated.id,
      status: updated.status,
      sibling_tasks_completed: siblingTasksCompleted,
    });
  } catch (error) {
    console.error("Error completing task:", error);
    return ErrorResponses.internalError();
  }
}
