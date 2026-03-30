import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import {
  generateCSVResponse,
  generateExcelCSVResponse,
  sanitizeForExport,
} from "@/lib/export-utils";

/** Resolve human-readable labels for audit log entity IDs */
async function resolveEntityLabels(
  audits: Array<{ entity_type: string; entity_id: string }>,
): Promise<Record<string, string>> {
  const byType = new Map<string, string[]>();
  for (const a of audits) {
    if (!byType.has(a.entity_type)) byType.set(a.entity_type, []);
    byType.get(a.entity_type)!.push(a.entity_id);
  }

  const result: Record<string, string> = {};

  for (const [entityType, ids] of byType) {
    const uniqueIds = [...new Set(ids)];
    switch (entityType) {
      case "EMPLOYEE": {
        const rows = await db
          .select({ id: schema.employees.id, full_name: schema.employees.full_name, employee_code: schema.employees.employee_code })
          .from(schema.employees)
          .where(inArray(schema.employees.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.full_name} (${r.employee_code})`;
        break;
      }
      case "DEPARTMENT": {
        const rows = await db
          .select({ id: schema.departments.id, name: schema.departments.name })
          .from(schema.departments)
          .where(inArray(schema.departments.id, uniqueIds));
        for (const r of rows) result[r.id] = r.name;
        break;
      }
      case "CLIENT": {
        const rows = await db
          .select({ id: schema.clients.id, client_name: schema.clients.client_name })
          .from(schema.clients)
          .where(inArray(schema.clients.id, uniqueIds));
        for (const r of rows) result[r.id] = r.client_name;
        break;
      }
      case "PROJECT": {
        const rows = await db
          .select({ id: schema.projects.id, project_name: schema.projects.project_name, project_code: schema.projects.project_code })
          .from(schema.projects)
          .where(inArray(schema.projects.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.project_name} (${r.project_code})`;
        break;
      }
      case "PROJECT_ALLOCATION": {
        const rows = await db
          .select({
            id: schema.projectAllocation.id,
            emp_name: schema.employees.full_name,
            project_name: schema.projects.project_name,
            project_code: schema.projects.project_code,
          })
          .from(schema.projectAllocation)
          .innerJoin(schema.employees, eq(schema.projectAllocation.emp_id, schema.employees.id))
          .innerJoin(schema.projects, eq(schema.projectAllocation.project_id, schema.projects.id))
          .where(inArray(schema.projectAllocation.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.emp_name} → ${r.project_name} (${r.project_code})`;
        break;
      }
      case "SKILL": {
        const rows = await db
          .select({ id: schema.skills.skill_id, skill_name: schema.skills.skill_name })
          .from(schema.skills)
          .where(inArray(schema.skills.skill_id, uniqueIds));
        for (const r of rows) result[r.id] = r.skill_name;
        break;
      }
      case "DAILY_PROJECT_LOG": {
        const rows = await db
          .select({
            id: schema.dailyProjectLogs.id,
            emp_name: schema.employees.full_name,
            project_name: schema.projects.project_name,
            log_date: schema.dailyProjectLogs.log_date,
            hours: schema.dailyProjectLogs.hours,
          })
          .from(schema.dailyProjectLogs)
          .innerJoin(schema.employees, eq(schema.dailyProjectLogs.emp_id, schema.employees.id))
          .innerJoin(schema.projects, eq(schema.dailyProjectLogs.project_id, schema.projects.id))
          .where(inArray(schema.dailyProjectLogs.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.emp_name} — ${r.project_name} on ${r.log_date} (${r.hours}h)`;
        break;
      }
      case "REPORT": {
        const rows = await db
          .select({
            id: schema.reports.id,
            report_type: schema.reports.report_type,
            emp_name: schema.employees.full_name,
            week_start_date: schema.reports.week_start_date,
          })
          .from(schema.reports)
          .innerJoin(schema.employees, eq(schema.reports.emp_id, schema.employees.id))
          .where(inArray(schema.reports.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.report_type} report — ${r.emp_name}${r.week_start_date ? ` (${r.week_start_date})` : ""}`;
        break;
      }
      default:
        break;
    }
  }

  return result;
}

/** Format changed_fields JSON into a human-readable string */
function formatChanges(changedFields: any): string {
  if (!changedFields || typeof changedFields !== "object") return "";
  const cf = changedFields as Record<string, any>;
  const entries = Object.entries(cf)
    .map(([field, val]) => {
      if (val && typeof val === "object" && "old" in val && "new" in val) {
        return `${field}: ${val.old ?? "(empty)"} → ${val.new ?? "(empty)"}`;
      }
      return `${field}: ${JSON.stringify(val)}`;
    });
  return entries.join(" | ");
}

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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const operation = searchParams.get("action"); // operation not action
    const entityType = searchParams.get("entity_type");

    // Build query conditions
    const conditions: any[] = [];
    if (startDate) {
      conditions.push(gte(schema.auditLogs.changed_at, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.auditLogs.changed_at, end));
    }
    if (operation && operation !== "ALL") {
      // UI may send "CREATE" (legacy) — map it to the DB value "INSERT"
      const dbOperation = operation === "CREATE" ? "INSERT" : operation;
      conditions.push(eq(schema.auditLogs.operation, dbOperation as any));
    }
    if (entityType && entityType !== "ALL") {
      conditions.push(eq(schema.auditLogs.entity_type, entityType.toUpperCase() as any));
    }

    // Fetch audit logs with user info
    const auditData = await db
      .select({
        changed_at: schema.auditLogs.changed_at,
        operation: schema.auditLogs.operation,
        entity_type: schema.auditLogs.entity_type,
        entity_id: schema.auditLogs.entity_id,
        user_name: schema.employees.full_name,
        user_code: schema.employees.employee_code,
        changed_fields: schema.auditLogs.changed_fields,
      })
      .from(schema.auditLogs)
      .leftJoin(
        schema.employees,
        eq(schema.auditLogs.changed_by, schema.employees.id),
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.changed_at))
      .limit(10000);

    // Resolve entity labels
    const labelMap = await resolveEntityLabels(auditData);

    // Transform data for export
    const exportData = sanitizeForExport(
      auditData.map((log) => ({
        timestamp: new Date(log.changed_at).toISOString(),
        operation: log.operation,
        entity_type: log.entity_type,
        entity: labelMap[log.entity_id] || log.entity_id,
        user_name: log.user_name || "System",
        user_code: log.user_code || "",
        changes: formatChanges(log.changed_fields),
      })),
    );

    const headers = [
      "timestamp",
      "operation",
      "entity_type",
      "entity",
      "user_name",
      "user_code",
      "changes",
    ];

    // Generate filename
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `audit_logs_export_${timestamp}`;

    // Export based on format
    if (format === "excel") {
      return generateExcelCSVResponse(exportData, headers, filename);
    } else {
      return generateCSVResponse(exportData, headers, filename);
    }
  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 },
    );
  }
}
