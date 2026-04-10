import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, asc } from "drizzle-orm";

/**
 * GET /api/projects/code-journey?id=<project_id>
 *
 * Reconstructs the full project-code lifecycle from audit_logs.
 * Handles three log formats that exist in the DB:
 *
 *  1. INSERT (flat)  – { project_code: "CL002-2026-C001", project_type: "C", ... }
 *  2. UPDATE (flat)  – { project_code: "CL002-2026-P001", project_type: "P", ... }
 *     (pre-diff-fix logs where updateData was stored directly)
 *  3. UPDATE (diff)  – { project_code: { from: "...", to: "..." }, project_type: { from, to } }
 *     (post-fix logs with proper before/after)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return ErrorResponses.badRequest("Project id is required");

    // Fetch current project
    const [project] = await db
      .select({
        id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_type: schema.projects.project_type,
        project_name: schema.projects.project_name,
        created_at: schema.projects.created_at,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, id))
      .limit(1);

    if (!project) return ErrorResponses.notFound("Project");

    // All audit logs for this project, oldest first
    const logs = await db
      .select({
        id: schema.auditLogs.id,
        operation: schema.auditLogs.operation,
        changed_at: schema.auditLogs.changed_at,
        changed_fields: schema.auditLogs.changed_fields,
        changed_by_name: schema.employees.full_name,
      })
      .from(schema.auditLogs)
      .leftJoin(
        schema.employees,
        eq(schema.auditLogs.changed_by, schema.employees.id),
      )
      .where(
        and(
          eq(schema.auditLogs.entity_type, "PROJECT"),
          eq(schema.auditLogs.entity_id, id),
        ),
      )
      .orderBy(asc(schema.auditLogs.changed_at));

    // ─── Build the journey ────────────────────────────────────────────────────
    type JourneyEntry = {
      code: string;
      type: string | null;
      event: "created" | "changed";
      changed_at: Date;
      changed_by: string | null;
      is_current: boolean;
    };

    const journey: JourneyEntry[] = [];

    // Track the "last known code" so we can reconstruct 'from' for old flat logs
    let lastCode: string | null = null;

    for (const log of logs) {
      const fields = log.changed_fields as Record<string, any> | null;
      if (!fields) continue;

      if (log.operation === "INSERT") {
        // Format 1: INSERT — project_code is always a flat string here
        const code: string | null = typeof fields.project_code === "string"
          ? fields.project_code
          : null;
        const type: string | null = typeof fields.project_type === "string"
          ? fields.project_type
          : null;

        if (code) {
          journey.push({ code, type, event: "created", changed_at: log.changed_at, changed_by: log.changed_by_name, is_current: false });
          lastCode = code;
        }

      } else if (log.operation === "UPDATE") {
        const raw = fields.project_code;

        if (!raw) continue; // this UPDATE didn't touch project_code — skip

        if (typeof raw === "object" && raw !== null && ("from" in raw || "to" in raw)) {
          // Format 3: new diff format { from, to }
          const toCode: string | null = raw.to ?? raw.new ?? null;
          const typeDiff = fields.project_type;
          const toType: string | null =
            typeDiff && typeof typeDiff === "object"
              ? (typeDiff.to ?? typeDiff.new ?? null)
              : typeof typeDiff === "string" ? typeDiff : null;

          if (toCode && toCode !== lastCode) {
            // If journey is empty and we have a 'from', synthesise origin first
            if (journey.length === 0 && raw.from) {
              const fromType = typeDiff && typeof typeDiff === "object"
                ? (typeDiff.from ?? typeDiff.old ?? null) : null;
              journey.push({
                code: raw.from,
                type: fromType,
                event: "created",
                changed_at: project.created_at,
                changed_by: null,
                is_current: false,
              });
            }
            journey.push({ code: toCode, type: toType, event: "changed", changed_at: log.changed_at, changed_by: log.changed_by_name, is_current: false });
            lastCode = toCode;
          }

        } else if (typeof raw === "string") {
          // Format 2: old flat format — raw IS the new code
          const newCode = raw;
          const newType = typeof fields.project_type === "string" ? fields.project_type : null;

          if (newCode !== lastCode) {
            // If first entry and we know it changed, there must have been a prior code
            // We can't recover 'from' for flat logs — just record this as a waypoint
            if (journey.length === 0) {
              // Synthesise origin with whatever we can infer from what came before
              // (The 'from' is unknown for flat logs — mark as "created" with a note)
              journey.push({
                code: newCode,
                type: newType,
                event: "created",
                changed_at: log.changed_at,
                changed_by: log.changed_by_name,
                is_current: false,
              });
            } else {
              journey.push({
                code: newCode,
                type: newType,
                event: "changed",
                changed_at: log.changed_at,
                changed_by: log.changed_by_name,
                is_current: false,
              });
            }
            lastCode = newCode;
          }
        }
      }
    }

    // ─── Deduplicate consecutive identical codes ──────────────────────────────
    // (Edge case: same code logged twice)
    const deduped = journey.filter(
      (e, i) => i === 0 || e.code !== journey[i - 1].code,
    );

    // ─── If still empty, synthesise a single origin from project.created_at ──
    if (deduped.length === 0) {
      deduped.push({
        code: project.project_code,
        type: project.project_type,
        event: "created",
        changed_at: project.created_at,
        changed_by: null,
        is_current: true,
      });
    } else {
      // Verify last entry matches the live code; if not, append the current code
      const last = deduped[deduped.length - 1];
      if (last.code !== project.project_code) {
        deduped.push({
          code: project.project_code,
          type: project.project_type,
          event: "changed",
          changed_at: project.created_at, // best guess — no log for this
          changed_by: null,
          is_current: true,
        });
      } else {
        last.is_current = true;
      }
    }

    return successResponse({ journey: deduped, current_code: project.project_code });
  } catch (error) {
    console.error("Error fetching code journey:", error);
    return ErrorResponses.internalError();
  }
}
