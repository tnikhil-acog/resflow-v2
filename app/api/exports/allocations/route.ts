import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, or, gte, isNull, and } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

/**
 * GET /api/exports/allocations
 * Export project allocations to CSV or Excel
 * Query params: format (csv|excel), status (current|all)
 * Access: HR Executive only
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR can export
    if (user.employee_role !== "hr_executive") {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status") || "current";

    // Build where conditions
    const whereConditions = [];

    if (status === "current") {
      // Current allocations: no end date or end date >= today
      const today = new Date().toISOString().split("T")[0];
      whereConditions.push(
        or(
          isNull(schema.projectAllocation.end_date),
          gte(schema.projectAllocation.end_date, today),
        ),
      );
    }

    // Fetch allocations with employee and project details
    const allocationsQuery = db
      .select({
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
        employee_type: schema.employees.employee_type,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        role: schema.projectAllocation.role,
        allocation_percentage: schema.projectAllocation.allocation_percentage,
        billability: schema.projectAllocation.billability,
        start_date: schema.projectAllocation.start_date,
        end_date: schema.projectAllocation.end_date,
      })
      .from(schema.projectAllocation)
      .innerJoin(
        schema.employees,
        eq(schema.projectAllocation.emp_id, schema.employees.id),
      )
      .innerJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .orderBy(schema.employees.employee_code, schema.projects.project_code);

    const allocations =
      whereConditions.length > 0
        ? await allocationsQuery.where(and(...whereConditions))
        : await allocationsQuery;

    // Determine allocation status based on dates
    const today = new Date().toISOString().split("T")[0];

    // Format data for export
    const exportData = sanitizeForExport(
      allocations.map((alloc) => {
        const isActive = !alloc.end_date || alloc.end_date >= today;
        return {
          employee_code: alloc.employee_code,
          employee_name: alloc.employee_name,
          employee_type: alloc.employee_type,
          project_code: alloc.project_code,
          project_name: alloc.project_name,
          role: alloc.role,
          allocation_percentage: alloc.allocation_percentage,
          billability: alloc.billability ? "Billable" : "Non-Billable",
          start_date: alloc.start_date,
          end_date: alloc.end_date || "",
          status: isActive ? "Active" : "Inactive",
        };
      }),
    );

    const headers = [
      "employee_code",
      "employee_name",
      "employee_type",
      "project_code",
      "project_name",
      "role",
      "allocation_percentage",
      "billability",
      "start_date",
      "end_date",
      "status",
    ];

    const filename = `allocations_${status}_${new Date().toISOString().split("T")[0]}`;

    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting allocations:", error);
    return ErrorResponses.internalError();
  }
}
