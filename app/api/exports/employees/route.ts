import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, isNotNull } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const user = await getCurrentUser(req);

    // Only HR can export
    if (!user || user.employee_role !== "hr_executive") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status") || "all"; // active, exited, all
    const departmentId = searchParams.get("department_id");

    // Build query conditions
    const conditions = [];
    if (status === "active") {
      conditions.push(eq(schema.employees.status, "ACTIVE"));
    } else if (status === "exited") {
      conditions.push(eq(schema.employees.status, "EXITED"));
    }
    if (departmentId && departmentId !== "ALL") {
      conditions.push(eq(schema.employees.department_id, departmentId));
    }

    // Fetch employees with department info
    const employeeData = await db
      .select({
        employee_code: schema.employees.employee_code,
        full_name: schema.employees.full_name,
        email: schema.employees.email,
        department: schema.departments.name,
        employee_type: schema.employees.employee_type,
        employee_role: schema.employees.employee_role,
        status: schema.employees.status,
        joined_on: schema.employees.joined_on,
        exited_on: schema.employees.exited_on,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.department_id, schema.departments.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schema.employees.employee_code);

    // Transform data for export
    const exportData = sanitizeForExport(
      employeeData.map((emp) => ({
        employee_code: emp.employee_code,
        employee_name: emp.full_name,
        email: emp.email,
        department: emp.department || "N/A",
        employee_type: emp.employee_type || "N/A",
        role: emp.employee_role,
        status: emp.status || "ACTIVE",
        joined_on: emp.joined_on,
        exited_on: emp.exited_on,
      })),
    );

    const headers = [
      "employee_code",
      "employee_name",
      "email",
      "department",
      "employee_type",
      "role",
      "status",
      "joined_on",
      "exited_on",
    ];

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `employees_export_${timestamp}`;

    // Export based on format
    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting employees:", error);
    return NextResponse.json(
      { error: "Failed to export employees" },
      { status: 500 },
    );
  }
}
