import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

const DB_ROLE_LABEL: Record<string, string> = {
  EMP: "Employee",
  PM: "Project Manager",
  HR: "HR Executive",
};

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user || user.employee_role !== "hr_executive") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status") || "all";
    const departmentId = searchParams.get("department_id");

    const conditions: any[] = [];
    if (status === "active") {
      conditions.push(eq(schema.employees.status, "ACTIVE"));
    } else if (status === "exited") {
      conditions.push(eq(schema.employees.status, "EXITED"));
    }
    if (departmentId && departmentId !== "ALL") {
      conditions.push(eq(schema.employees.department_id, departmentId));
    }

    // Alias for self-join (reporting manager)
    const managers = alias(schema.employees, "managers");

    const employeeDataFull = await db
      .select({
        employee_code: schema.employees.employee_code,
        ldap_username: schema.employees.ldap_username,
        full_name: schema.employees.full_name,
        email: schema.employees.email,
        gender: schema.employees.gender,
        employee_type: schema.employees.employee_type,
        employee_role: schema.employees.employee_role,
        employee_design: schema.employees.employee_design,
        working_location: schema.employees.working_location,
        department: schema.departments.name,
        experience_years: schema.employees.experience_years,
        college: schema.employees.college,
        educational_stream: schema.employees.educational_stream,
        status: schema.employees.status,
        joined_on: schema.employees.joined_on,
        exited_on: schema.employees.exited_on,
        reporting_manager_name: managers.full_name,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.department_id, schema.departments.id),
      )
      .leftJoin(
        managers,
        eq(schema.employees.reporting_manager_id, managers.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schema.employees.employee_code);

    const exportData = sanitizeForExport(
      employeeDataFull.map((emp) => ({
        employee_code: emp.employee_code,
        ldap_username: emp.ldap_username,
        full_name: emp.full_name,
        email: emp.email,
        gender: emp.gender || "",
        designation: emp.employee_design || "",
        employee_type: emp.employee_type || "",
        role: DB_ROLE_LABEL[emp.employee_role] ?? emp.employee_role,
        department: emp.department || "",
        working_location: emp.working_location || "",
        reporting_manager: emp.reporting_manager_name || "",
        experience_years: emp.experience_years || "",
        college: emp.college || "",
        educational_stream: emp.educational_stream || "",
        status: emp.status,
        joined_on: emp.joined_on,
        exited_on: emp.exited_on || "",
      })),
    );

    const headers = [
      "employee_code",
      "ldap_username",
      "full_name",
      "email",
      "gender",
      "designation",
      "employee_type",
      "role",
      "department",
      "working_location",
      "reporting_manager",
      "experience_years",
      "college",
      "educational_stream",
      "status",
      "joined_on",
      "exited_on",
    ];

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `employees_export_${timestamp}`;

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
