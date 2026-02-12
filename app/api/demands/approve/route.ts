// POST /api/demands/approve
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, action: "approve" | "reject" }
// Get demand: SELECT id, demand_status FROM resource_demands WHERE id = ?
// If action = "approve":
//   - UPDATE resource_demands SET demand_status = 'FULFILLED' WHERE id = ?
// If action = "reject":
//   - UPDATE resource_demands SET demand_status = 'CANCELLED' WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, demand_status }
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
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, demand_id, action, task_id } = body;

    // Accept either 'id' or 'demand_id' for backward compatibility
    const demandId = id || demand_id;

    // Validate required fields
    const missingFields = validateRequiredFields({ id: demandId, action }, [
      "id",
      "action",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate action
    if (action !== "approve" && action !== "reject") {
      return ErrorResponses.badRequest('action must be "approve" or "reject"');
    }

    // Get demand
    const [demand] = await db
      .select()
      .from(schema.resourceDemands)
      .where(eq(schema.resourceDemands.id, demandId));

    if (!demand) {
      return ErrorResponses.notFound("Demand");
    }

    // Determine new status
    const newStatus = action === "approve" ? "FULFILLED" : "CANCELLED";

    // Update demand status
    const [updated] = await db
      .update(schema.resourceDemands)
      .set({
        demand_status: newStatus,
      })
      .where(eq(schema.resourceDemands.id, demandId))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "DEMAND",
      entity_id: demandId,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        demand_status: {
          old: demand.demand_status,
          new: newStatus,
        },
        action,
      },
    });

    // Complete the approval task(s) for this demand
    let approvalTasksCompleted = 0;

    if (task_id) {
      // If task_id is provided, complete only that specific task
      const [specificTask] = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.id, task_id),
            eq(schema.tasks.entity_type, "DEMAND"),
            eq(schema.tasks.entity_id, demandId),
            eq(schema.tasks.status, "DUE"),
          ),
        );

      if (specificTask) {
        await db
          .update(schema.tasks)
          .set({ status: "COMPLETED" })
          .where(eq(schema.tasks.id, task_id));

        await createAuditLog({
          entity_type: "TASK",
          entity_id: task_id,
          operation: "UPDATE",
          changed_by: user.id,
          changed_fields: {
            status: "COMPLETED",
            completion_reason: `Demand ${action}d by HR`,
          },
        });
        approvalTasksCompleted = 1;
      }
    } else {
      // Otherwise, complete all matching tasks (backward compatibility)
      const approvalTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.entity_type, "DEMAND"),
            eq(schema.tasks.entity_id, demandId),
            eq(schema.tasks.status, "DUE"),
          ),
        );

      // Mark all related approval tasks as completed
      if (approvalTasks.length > 0) {
        await db
          .update(schema.tasks)
          .set({ status: "COMPLETED" })
          .where(
            and(
              eq(schema.tasks.entity_type, "DEMAND"),
              eq(schema.tasks.entity_id, demandId),
              eq(schema.tasks.status, "DUE"),
            ),
          );

        // Create audit logs for task completions
        for (const task of approvalTasks) {
          await createAuditLog({
            entity_type: "TASK",
            entity_id: task.id,
            operation: "UPDATE",
            changed_by: user.id,
            changed_fields: {
              status: "COMPLETED",
              completion_reason: `Demand ${action}d by HR`,
            },
          });
        }
        approvalTasksCompleted = approvalTasks.length;
      }
    }

    let allocationTasksCreated = 0;

    // If approved, create allocation task for HR
    if (action === "approve") {
      // Get demand details for task description
      const [demandDetails] = await db
        .select({
          role_required: schema.resourceDemands.role_required,
          start_date: schema.resourceDemands.start_date,
          project_name: schema.projects.project_name,
          project_code: schema.projects.project_code,
          requested_by_name: schema.employees.full_name,
        })
        .from(schema.resourceDemands)
        .innerJoin(
          schema.projects,
          eq(schema.resourceDemands.project_id, schema.projects.id),
        )
        .innerJoin(
          schema.employees,
          eq(schema.resourceDemands.requested_by, schema.employees.id),
        )
        .where(eq(schema.resourceDemands.id, demandId));

      // Get all active HR executives to assign allocation task
      const hrExecutives = await db
        .select({
          id: schema.employees.id,
        })
        .from(schema.employees)
        .where(
          and(
            eq(schema.employees.employee_role, "HR"),
            eq(schema.employees.status, "ACTIVE"),
          ),
        );

      // Create allocation task description
      const allocationTaskDescription = `Allocate resources for approved demand: ${demandDetails?.role_required || "Role"} needed for "${demandDetails?.project_name || "Project"}" (${demandDetails?.project_code || ""}) starting ${demandDetails?.start_date || ""}. Requested by: ${demandDetails?.requested_by_name || "PM"}`;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

      // Create allocation task for each HR executive
      for (const hr of hrExecutives) {
        await db.insert(schema.tasks).values({
          owner_id: hr.id,
          entity_type: "DEMAND",
          entity_id: demandId,
          description: allocationTaskDescription,
          due_on: dueDate.toISOString().split("T")[0],
          assigned_by: user.id,
          status: "DUE",
        });
        allocationTasksCreated++;
      }

      // Create audit log for new allocation tasks
      await createAuditLog({
        entity_type: "DEMAND",
        entity_id: demandId,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: {
          allocation_tasks_created: allocationTasksCreated,
        },
      });
    }

    return successResponse({
      id: updated.id,
      demand_status: updated.demand_status,
      approval_tasks_completed: approvalTasksCompleted,
      allocation_tasks_created: allocationTasksCreated,
      message:
        action === "approve"
          ? `Demand approved. ${approvalTasksCompleted} approval task(s) completed, ${allocationTasksCreated} allocation task(s) created.`
          : `Demand rejected. ${approvalTasksCompleted} approval task(s) completed.`,
    });
  } catch (error) {
    console.error("Error approving/rejecting demand:", error);
    return ErrorResponses.internalError();
  }
}
