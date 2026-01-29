// POST /api/allocations/transfer
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { allocation_id, new_project_id, transfer_date }
// Get old allocation: SELECT * FROM project_allocation WHERE id = allocation_id
// Validate: transfer_date must be between start_date and end_date, else return 400 "transfer_date must be between start_date and end_date"
// UPDATE old allocation SET end_date = transfer_date WHERE id = allocation_id
// INSERT new allocation with same emp_id, role, allocation_percentage, billability, is_critical_resource but project_id = new_project_id, start_date = transfer_date, assigned_by = current_user_id
// INSERT audit logs for both UPDATE and INSERT operations with changed_by=current_user_id
// Return: { old_allocation: { id, end_date }, new_allocation: { id, emp_id, project_id, role, allocation_percentage, start_date, end_date, billability, is_critical_resource, assigned_by } }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { allocation_id, new_project_id, transfer_date } = body;

    if (!allocation_id || !new_project_id || !transfer_date) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const transferDateStr = toDateString(transfer_date)!;

    const [oldAllocation] = await db
      .select()
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.id, allocation_id));

    if (!oldAllocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    if (
      transferDateStr < oldAllocation.start_date ||
      (oldAllocation.end_date && transferDateStr > oldAllocation.end_date)
    ) {
      return NextResponse.json(
        { error: "transfer_date must be between start_date and end_date" },
        { status: 400 },
      );
    }

    // Use Drizzle transaction
    const result = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(schema.projectAllocation)
        .set({ end_date: transferDateStr, updated_at: new Date() })
        .where(eq(schema.projectAllocation.id, allocation_id))
        .returning();

      const [newAllocation] = await tx
        .insert(schema.projectAllocation)
        .values({
          emp_id: oldAllocation.emp_id,
          project_id: new_project_id,
          role: oldAllocation.role,
          allocation_percentage: oldAllocation.allocation_percentage,
          start_date: transferDateStr,
          end_date: oldAllocation.end_date,
          billability: oldAllocation.billability,
          assigned_by: user.id,
        })
        .returning();

      await createAuditLog({
        entity_type: "PROJECT_ALLOCATION",
        entity_id: allocation_id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: { end_date: transferDateStr },
      });

      await createAuditLog({
        entity_type: "PROJECT_ALLOCATION",
        entity_id: newAllocation.id,
        operation: "INSERT",
        changed_by: user.id,
        changed_fields: newAllocation,
      });

      return {
        old_allocation: { id: updated.id, end_date: updated.end_date },
        new_allocation: newAllocation,
      };
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error transferring allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
