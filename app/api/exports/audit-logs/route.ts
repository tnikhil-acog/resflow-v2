import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { eq, and, gte, lte, desc } from "drizzle-orm";
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
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const operation = searchParams.get("action"); // operation not action
    const entityType = searchParams.get("entity_type");

    // Build query conditions
    const conditions = [];
    if (startDate) {
      conditions.push(gte(schema.auditLogs.changed_at, new Date(startDate)));
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(schema.auditLogs.changed_at, end));
    }
    if (operation && operation !== "ALL") {
      conditions.push(eq(schema.auditLogs.operation, operation));
    }
    if (entityType && entityType !== "ALL") {
      // Convert lowercase entity_type to uppercase enum value
      const entityTypeUpper = entityType.toUpperCase();
      conditions.push(eq(schema.auditLogs.entity_type, entityTypeUpper as any));
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
      .limit(10000); // Limit to prevent huge exports

    // Transform data for export
    const exportData = sanitizeForExport(
      auditData.map((log) => ({
        timestamp: new Date(log.changed_at).toISOString(),
        operation: log.operation,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        user_name: log.user_name || "System",
        user_code: log.user_code || "N/A",
        changes: JSON.stringify(log.changed_fields || {}),
      })),
    );

    const headers = [
      "timestamp",
      "operation",
      "entity_type",
      "entity_id",
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
