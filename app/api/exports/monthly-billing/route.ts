import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { eq, and, sql } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";
import {
  getCurrentMonthYear,
  isValidMonth,
  isValidYear,
} from "@/lib/reporting-utils";

/**
 * GET /api/exports/monthly-billing
 * Export monthly billing summary to CSV or Excel
 * Query params: month, year, format (csv|excel)
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
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");
    const format = searchParams.get("format") || "csv";

    // Default to current month/year
    const current = getCurrentMonthYear();
    const month = monthParam ? parseInt(monthParam) : current.month;
    const year = yearParam ? parseInt(yearParam) : current.year;

    // Validate
    if (!isValidMonth(month) || !isValidYear(year)) {
      return ErrorResponses.badRequest("Invalid month or year");
    }

    // Fetch monthly billing data
    const billingData = await db
      .select({
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        client_name: schema.clients.client_name,
        project_manager: schema.employees.full_name,
        total_billable_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
        `,
        total_employees: sql<number>`
          COUNT(DISTINCT ${schema.dailyProjectLogs.emp_id})
        `,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
          eq(schema.projectAllocation.billability, true),
        ),
      )
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .leftJoin(
        schema.clients,
        eq(schema.projects.client_id, schema.clients.id),
      )
      .leftJoin(
        schema.employees,
        eq(schema.projects.project_manager_id, schema.employees.id),
      )
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${schema.dailyProjectLogs.log_date}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${schema.dailyProjectLogs.log_date}) = ${year}`,
        ),
      )
      .groupBy(
        schema.projects.id,
        schema.projects.project_code,
        schema.projects.project_name,
        schema.clients.client_name,
        schema.employees.full_name,
      )
      .orderBy(schema.projects.project_code);

    // Format data for export
    const exportData = sanitizeForExport(
      billingData.map((record) => ({
        month,
        year,
        project_code: record.project_code,
        project_name: record.project_name,
        client_name: record.client_name || "Internal",
        project_manager: record.project_manager || "",
        total_billable_hours: parseFloat(
          record.total_billable_hours.toString(),
        ).toFixed(2),
        total_employees: record.total_employees,
      })),
    );

    const headers = [
      "month",
      "year",
      "project_code",
      "project_name",
      "client_name",
      "project_manager",
      "total_billable_hours",
      "total_employees",
    ];

    const filename = `monthly_billing_${year}_${month.toString().padStart(2, "0")}`;

    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting monthly billing:", error);
    return ErrorResponses.internalError();
  }
}
