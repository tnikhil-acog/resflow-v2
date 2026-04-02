import { db, schema } from "@/lib/db";

export interface AuditLogData {
  entity_type:
    | "EMPLOYEE"
    | "DEPARTMENT"
    | "CLIENT"
    | "PROJECT"
    | "PROJECT_ALLOCATION"
    | "SKILL"
    | "EMPLOYEE_SKILL"
    | "DEMAND"
    | "DEMAND_SKILL"
    | "REPORT"
    | "TASK"
    | "PHASE"
    | "PHASE_REPORT"
    | "DAILY_PROJECT_LOG"
    | "ATTRIBUTE"
    | "ATTRIBUTE_VALUE";
  entity_id: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string;
  changed_fields: any;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      operation: data.operation,
      changed_by: data.changed_by,
      changed_fields: data.changed_fields,
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw error - audit log failure shouldn't break the main operation
  }
}
