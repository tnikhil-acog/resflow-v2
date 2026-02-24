import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
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
    const status = searchParams.get("status") || "all"; // active, completed, all
    const projectType = searchParams.get("project_type"); // client, internal

    // Build query conditions
    const conditions = [];
    if (status === "active") {
      conditions.push(eq(schema.projects.status, "ACTIVE"));
    } else if (status === "completed") {
      conditions.push(eq(schema.projects.status, "COMPLETED"));
    }
    if (projectType && projectType !== "ALL") {
      if (projectType === "client") {
        conditions.push(eq(schema.projects.project_type, "client"));
      } else if (projectType === "internal") {
        conditions.push(eq(schema.projects.project_type, "internal"));
      }
    }

    // Fetch projects with client and PM info
    const projectData = await db
      .select({
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        project_type: schema.projects.project_type,
        status: schema.projects.status,
        economic_billability: schema.projects.economic_billability,
        capacity_billability: schema.projects.capacity_billability,
        client_name: schema.clients.client_name,
        pm_name: schema.employees.full_name,
        started_on: schema.projects.started_on,
        closed_on: schema.projects.closed_on,
        short_description: schema.projects.short_description,
      })
      .from(schema.projects)
      .leftJoin(
        schema.clients,
        eq(schema.projects.client_id, schema.clients.id),
      )
      .leftJoin(
        schema.employees,
        eq(schema.projects.project_manager_id, schema.employees.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(schema.projects.project_code);

    // Transform data for export
    const exportData = sanitizeForExport(
      projectData.map((proj) => ({
        project_code: proj.project_code,
        project_name: proj.project_name,
        project_type: proj.project_type || "N/A",
        status: proj.status,
        economic_billability: proj.economic_billability ? "Yes" : "No",
        capacity_billability: proj.capacity_billability ? "Yes" : "No",
        client: proj.client_name || "N/A",
        project_manager: proj.pm_name || "N/A",
        started_on: proj.started_on,
        closed_on: proj.closed_on,
        description: proj.short_description || "",
      })),
    );

    const headers = [
      "project_code",
      "project_name",
      "project_type",
      "status",
      "economic_billability",
      "capacity_billability",
      "client",
      "project_manager",
      "started_on",
      "closed_on",
      "description",
    ];

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `projects_export_${timestamp}`;

    // Export based on format
    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting projects:", error);
    return NextResponse.json(
      { error: "Failed to export projects" },
      { status: 500 },
    );
  }
}
