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

    // Fetch monthly billing data — per-employee, per-project breakdown
    const billingData = await db
      .select({
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
        project_id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        client_name: schema.clients.client_name,
        billability: schema.projectAllocation.billability,
        total_hours: sql<number>`
          COALESCE(SUM(${schema.dailyProjectLogs.hours}::numeric), 0)
        `,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.employees,
        eq(schema.dailyProjectLogs.emp_id, schema.employees.id),
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
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
        ),
      )
      .where(
        and(
          sql`EXTRACT(MONTH FROM ${schema.dailyProjectLogs.log_date}) = ${month}`,
          sql`EXTRACT(YEAR FROM ${schema.dailyProjectLogs.log_date}) = ${year}`,
        ),
      )
      .groupBy(
        schema.employees.id,
        schema.employees.employee_code,
        schema.employees.full_name,
        schema.projects.id,
        schema.projects.project_code,
        schema.projects.project_name,
        schema.clients.client_name,
        schema.projectAllocation.billability,
      )
      .orderBy(schema.projects.project_code, schema.employees.employee_code);

    // Fetch PM names for projects
    const pmMap: Record<string, string> = {};
    const pmRows = await db
      .select({ id: schema.projects.id, pm_name: schema.employees.full_name })
      .from(schema.projects)
      .leftJoin(
        schema.employees,
        eq(schema.projects.project_manager_id, schema.employees.id),
      );
    for (const r of pmRows) pmMap[r.id] = r.pm_name || "";

    // Format data for export
    const exportData = sanitizeForExport(
      billingData.map((record) => ({
        month,
        year,
        project_code: record.project_code,
        project_name: record.project_name,
        client_name: record.client_name || "Internal",
        project_manager: pmMap[record.project_id] || "",
        employee_code: record.employee_code,
        employee_name: record.employee_name,
        billability: record.billability ? "Billable" : "Non-Billable",
        hours: parseFloat(record.total_hours.toString()).toFixed(2),
      })),
    );

    const headers = [
      "month",
      "year",
      "project_code",
      "project_name",
      "client_name",
      "project_manager",
      "employee_code",
      "employee_name",
      "billability",
      "hours",
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
