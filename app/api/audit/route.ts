import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
  getPaginationParams,
  buildAuditFilters,
} from "@/lib/api-helpers";
import { eq, and, desc, sql, gte, lt, inArray } from "drizzle-orm";

/**
 * Resolve a human-readable label for each audit log entry based on entity_type + entity_id.
 * Results are keyed by entity_id UUID.
 */
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
      case "EMPLOYEE_SKILL": {
        const rows = await db
          .select({
            id: schema.employeeSkills.id,
            emp_name: schema.employees.full_name,
            skill_name: schema.skills.skill_name,
          })
          .from(schema.employeeSkills)
          .innerJoin(schema.employees, eq(schema.employeeSkills.emp_id, schema.employees.id))
          .innerJoin(schema.skills, eq(schema.employeeSkills.skill_id, schema.skills.skill_id))
          .where(inArray(schema.employeeSkills.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.emp_name}: ${r.skill_name}`;
        break;
      }
      case "DEMAND": {
        const rows = await db
          .select({
            id: schema.resourceDemands.id,
            role_required: schema.resourceDemands.role_required,
            project_name: schema.projects.project_name,
            project_code: schema.projects.project_code,
          })
          .from(schema.resourceDemands)
          .innerJoin(schema.projects, eq(schema.resourceDemands.project_id, schema.projects.id))
          .where(inArray(schema.resourceDemands.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.role_required} for ${r.project_name} (${r.project_code})`;
        break;
      }
      case "TASK": {
        const rows = await db
          .select({ id: schema.tasks.id, description: schema.tasks.description, entity_type: schema.tasks.entity_type })
          .from(schema.tasks)
          .where(inArray(schema.tasks.id, uniqueIds));
        for (const r of rows) {
          const desc = r.description ?? "";
          result[r.id] = desc.length > 60 ? desc.slice(0, 60) + "…" : desc || `${r.entity_type ?? ""} Task`;
        }
        break;
      }
      case "REPORT": {
        const rows = await db
          .select({
            id: schema.reports.id,
            report_type: schema.reports.report_type,
            emp_name: schema.employees.full_name,
            week_start_date: schema.reports.week_start_date,
            report_date: schema.reports.report_date,
          })
          .from(schema.reports)
          .innerJoin(schema.employees, eq(schema.reports.emp_id, schema.employees.id))
          .where(inArray(schema.reports.id, uniqueIds));
        for (const r of rows) {
          const date = r.week_start_date || r.report_date || "";
          result[r.id] = `${r.report_type} report — ${r.emp_name}${date ? ` (${date})` : ""}`;
        }
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
      case "PHASE": {
        const rows = await db
          .select({
            id: schema.phases.id,
            phase_name: schema.phases.phase_name,
            project_name: schema.projects.project_name,
          })
          .from(schema.phases)
          .innerJoin(schema.projects, eq(schema.phases.project_id, schema.projects.id))
          .where(inArray(schema.phases.id, uniqueIds));
        for (const r of rows) result[r.id] = `${r.phase_name} (${r.project_name})`;
        break;
      }
      // DEMAND_SKILL, PHASE_REPORT, ATTRIBUTE, ATTRIBUTE_VALUE — fall through, no label
    }
  }
  return result;
}

// GET /api/audit/list
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR executives can view audit logs
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const url = new URL(req.url);
    const { page, limit, offset } = getPaginationParams(url);

    // Build filters from query parameters
    const filters = buildAuditFilters(url.searchParams, {
      eq,
      and,
      gte,
      lt,
      sql,
    });

    // Get total count with filters
    const total = await getCount(
      schema.auditLogs,
      filters.length > 0 ? and(...filters) : undefined,
    );

    // Fetch audit logs with filters, join employees for changed_by_name
    const audits = await db
      .select({
        id: schema.auditLogs.id,
        entity_type: schema.auditLogs.entity_type,
        entity_id: schema.auditLogs.entity_id,
        operation: schema.auditLogs.operation,
        changed_by: schema.auditLogs.changed_by,
        changed_by_name: schema.employees.full_name,
        changed_at: schema.auditLogs.changed_at,
        changed_fields: schema.auditLogs.changed_fields,
      })
      .from(schema.auditLogs)
      .leftJoin(
        schema.employees,
        eq(schema.auditLogs.changed_by, schema.employees.id),
      )
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(schema.auditLogs.changed_at))
      .limit(limit)
      .offset(offset);

    const labelMap = await resolveEntityLabels(audits);
    const enrichedAudits = audits.map((a) => ({
      ...a,
      entity_label: labelMap[a.entity_id] ?? null,
    }));

    return successResponse({
      audits: enrichedAudits,
      total,
      page,
      limit,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error fetching audit logs:", error);
    return ErrorResponses.internalError();
  }
}

// POST /api/audit/log
// INTERNAL ENDPOINT - Called by other API routes after INSERT/UPDATE/DELETE
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Must be authenticated (any role can create audit logs internally)
    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { entity_type, entity_id, operation, changed_fields } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "entity_type",
      "entity_id",
      "operation",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate operation type
    const validOperations = ["INSERT", "UPDATE", "DELETE"];
    if (!validOperations.includes(operation)) {
      return ErrorResponses.badRequest(
        `Invalid operation. Must be one of: ${validOperations.join(", ")}`,
      );
    }

    // Create audit log entry
    const [auditLog] = await db
      .insert(schema.auditLogs)
      .values({
        entity_type,
        entity_id,
        operation,
        changed_by: user.id,
        changed_fields: changed_fields || null,
      })
      .returning();

    return successResponse({
      id: auditLog.id,
      entity_type: auditLog.entity_type,
      entity_id: auditLog.entity_id,
      operation: auditLog.operation,
      changed_by: auditLog.changed_by,
      changed_at: auditLog.changed_at,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error creating audit log:", error);
    return ErrorResponses.internalError();
  }
}
