// POST /api/employees/exit
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, exited_on }
// Validate: exited_on must be >= joined_on, else return 400 "exited_on must be >= joined_on"
// Check for active allocations: SELECT COUNT(*) FROM project_allocation WHERE emp_id = ? AND end_date > exited_on
// If count > 0, return 400 "Employee has active allocations with end_date after exited_on"
// UPDATE employees SET status = 'EXITED', exited_on = ? WHERE id = ?
// End allocations: UPDATE project_allocation SET end_date = exited_on WHERE emp_id = ? AND end_date > exited_on
// Delete incomplete tasks: DELETE FROM tasks WHERE owner_id = ? AND status = 'DUE'
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, status, exited_on, allocations_ended: count, tasks_cancelled: count }

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
import { eq, and, gt, ne, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, exited_on } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id", "exited_on"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get employee
    const [employee] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, id));

    if (!employee) {
      return ErrorResponses.notFound("Employee");
    }

    const exitedOnStr = toDateString(exited_on)!;

    // Validate exited_on >= joined_on
    if (exitedOnStr < employee.joined_on) {
      return ErrorResponses.badRequest("exited_on must be >= joined_on");
    }

    // Check for active allocations after exit date
    const activeAllocationsCount = await getCount(
      schema.projectAllocation,
      and(
        eq(schema.projectAllocation.emp_id, id),
        gt(schema.projectAllocation.end_date, exitedOnStr),
      ),
    );

    if (activeAllocationsCount > 0) {
      return ErrorResponses.badRequest(
        "Employee has active allocations with end_date after exited_on",
      );
    }

    // Use transaction to update employee, end allocations, and cancel tasks
    const result = await db.transaction(async (tx) => {
      // Update employee status
      const [updated] = await tx
        .update(schema.employees)
        .set({
          status: "EXITED",
          exited_on: exitedOnStr,
          updated_at: new Date(),
        })
        .where(eq(schema.employees.id, id))
        .returning();

      // End allocations where end_date > exited_on
      const endedAllocations = await tx
        .update(schema.projectAllocation)
        .set({
          end_date: exitedOnStr,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(schema.projectAllocation.emp_id, id),
            gt(schema.projectAllocation.end_date, exitedOnStr),
          ),
        )
        .returning();

      // Cancel tasks that are not completed (only DUE tasks remain)
      const cancelledTasks = await tx
        .delete(schema.tasks)
        .where(
          and(eq(schema.tasks.owner_id, id), eq(schema.tasks.status, "DUE")),
        )
        .returning();

      return {
        employee: updated,
        allocations_ended: endedAllocations.length,
        tasks_cancelled: cancelledTasks.length,
      };
    });

    await createAuditLog({
      entity_type: "EMPLOYEE",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        status: "EXITED",
        exited_on: exitedOnStr,
        allocations_ended: result.allocations_ended,
        tasks_cancelled: result.tasks_cancelled,
      },
    });

    return successResponse({
      id: result.employee.id,
      employee_code: result.employee.employee_code,
      status: result.employee.status,
      exited_on: result.employee.exited_on,
      allocations_ended: result.allocations_ended,
      tasks_cancelled: result.tasks_cancelled,
    });
  } catch (error) {
    console.error("Error exiting employee:", error);
    return ErrorResponses.internalError();
  }
}
