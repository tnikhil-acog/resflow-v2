import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { and, gte, lte, eq, sql } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

/**
 * GET /api/exports/reports
 * Export weekly reports to CSV or Excel
 * Query params: start_date, end_date, format (csv|excel), emp_id
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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const format = searchParams.get("format") || "csv";
    const empId = searchParams.get("emp_id");

    // Validate required params
    if (!startDate || !endDate) {
      return ErrorResponses.badRequest("start_date and end_date are required");
    }

    // Build where conditions
    const whereConditions = [
      gte(schema.reports.week_start_date, startDate),
      lte(schema.reports.week_end_date, endDate),
    ];

    if (empId && empId !== "ALL") {
      whereConditions.push(eq(schema.reports.emp_id, empId));
    }

    // Fetch reports with employee details
    const reports = await db
      .select({
        week_start: schema.reports.week_start_date,
        week_end: schema.reports.week_end_date,
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
        report_type: schema.reports.report_type,
        weekly_hours: schema.reports.weekly_hours,
        created_at: schema.reports.created_at,
      })
      .from(schema.reports)
      .innerJoin(
        schema.employees,
        eq(schema.reports.emp_id, schema.employees.id),
      )
      .where(and(...whereConditions))
      .orderBy(schema.reports.week_start_date, schema.employees.employee_code);

    // Format data for export - calculate total hours from weekly_hours jsonb
    const exportData = sanitizeForExport(
      reports.map((report) => {
        let totalHours = 0;
        if (report.weekly_hours && typeof report.weekly_hours === "object") {
          // Sum up hours from the weekly_hours JSON structure
          const hoursData = report.weekly_hours as any;
          if (Array.isArray(hoursData)) {
            totalHours = hoursData.reduce(
              (sum, day) => sum + (parseFloat(day.hours) || 0),
              0,
            );
          }
        }

        return {
          week_start: report.week_start,
          week_end: report.week_end,
          employee_code: report.employee_code,
          employee_name: report.employee_name,
          report_type: report.report_type,
          total_hours: totalHours.toFixed(2),
          created_at: report.created_at,
        };
      }),
    );

    const headers = [
      "week_start",
      "week_end",
      "employee_code",
      "employee_name",
      "report_type",
      "total_hours",
      "created_at",
    ];

    const filename = `weekly_reports_${startDate}_${endDate}`;

    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting reports:", error);
    return ErrorResponses.internalError();
  }
}
