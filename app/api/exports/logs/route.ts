import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ErrorResponses } from "@/lib/api-helpers";
import { and, gte, lte, eq } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

/**
 * GET /api/exports/logs
 * Export work logs to CSV or Excel
 * Query params: start_date, end_date, format (csv|excel), emp_id, project_id
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
    const projectId = searchParams.get("project_id");

    // Validate required params
    if (!startDate || !endDate) {
      return ErrorResponses.badRequest("start_date and end_date are required");
    }

    // Build where conditions
    const whereConditions = [
      gte(schema.dailyProjectLogs.log_date, startDate),
      lte(schema.dailyProjectLogs.log_date, endDate),
    ];

    if (empId && empId !== "ALL") {
      whereConditions.push(eq(schema.dailyProjectLogs.emp_id, empId));
    }

    if (projectId && projectId !== "ALL") {
      whereConditions.push(eq(schema.dailyProjectLogs.project_id, projectId));
    }

    // Fetch logs with employee and project details
    const logs = await db
      .select({
        log_date: schema.dailyProjectLogs.log_date,
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        hours: schema.dailyProjectLogs.hours,
        notes: schema.dailyProjectLogs.notes,
        billability: schema.projectAllocation.billability,
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
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
        ),
      )
      .where(and(...whereConditions))
      .orderBy(
        schema.dailyProjectLogs.log_date,
        schema.employees.employee_code,
      );

    // Format data for export
    const exportData = sanitizeForExport(
      logs.map((log) => ({
        log_date: log.log_date,
        employee_code: log.employee_code,
        employee_name: log.employee_name,
        project_code: log.project_code,
        project_name: log.project_name,
        hours: log.hours,
        notes: log.notes || "",
        billability:
          log.billability === true
            ? "Billable"
            : log.billability === false
              ? "Non-Billable"
              : "Unknown",
      })),
    );

    const headers = [
      "log_date",
      "employee_code",
      "employee_name",
      "project_code",
      "project_name",
      "hours",
      "notes",
      "billability",
    ];

    const filename = `work_logs_${startDate}_${endDate}`;

    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting logs:", error);
    return ErrorResponses.internalError();
  }
}
