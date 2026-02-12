import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, sql, or, isNull, gte } from "drizzle-orm";

/**
 * GET /api/employees/[id]/billability
 * Get employee billability breakdown based on current allocations
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    const { id: employeeId } = await params;

    // Check access permissions
    if (
      user.id !== employeeId &&
      user.employee_role !== "hr_executive" &&
      user.employee_role !== "project_manager"
    ) {
      return ErrorResponses.accessDenied();
    }

    // Get current allocations with billability
    const allocations = await db
      .select({
        project_id: schema.projectAllocation.project_id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        allocation_percentage: schema.projectAllocation.allocation_percentage,
        billability: schema.projectAllocation.billability,
        start_date: schema.projectAllocation.start_date,
        end_date: schema.projectAllocation.end_date,
      })
      .from(schema.projectAllocation)
      .innerJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(
        and(
          eq(schema.projectAllocation.emp_id, employeeId),
          or(
            isNull(schema.projectAllocation.end_date),
            gte(schema.projectAllocation.end_date, sql`CURRENT_DATE`),
          ),
        ),
      );

    // Calculate billable and non-billable percentages
    let billablePercentage = 0;
    let nonBillablePercentage = 0;

    allocations.forEach((allocation) => {
      const percentage = parseFloat(
        allocation.allocation_percentage?.toString() || "0",
      );
      if (allocation.billability) {
        billablePercentage += percentage;
      } else {
        nonBillablePercentage += percentage;
      }
    });

    return successResponse({
      employee_id: employeeId,
      billable_percentage: Math.round(billablePercentage * 100) / 100,
      non_billable_percentage: Math.round(nonBillablePercentage * 100) / 100,
      total_allocation:
        Math.round((billablePercentage + nonBillablePercentage) * 100) / 100,
      allocations: allocations.map((a) => ({
        project_code: a.project_code,
        project_name: a.project_name,
        allocation_percentage: parseFloat(
          a.allocation_percentage?.toString() || "0",
        ),
        billability: a.billability || false,
        start_date: a.start_date,
        end_date: a.end_date,
      })),
    });
  } catch (error) {
    console.error("Error fetching employee billability:", error);
    return ErrorResponses.internalError();
  }
}
