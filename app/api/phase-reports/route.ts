// POST /api/phase-reports/create
// Allowed Roles: project_manager, hr_executive
// Accept: { phase_id, content }
// Validation:
//   - project_manager: Can create WHERE phase_id IN (SELECT id FROM phase WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403
//   - hr_executive: Can create for any phase
// INSERT into phase_report table with submitted_by = current_user_id, submitted_at = NOW()
// Return: { id, phase_id, content, submitted_by, submitted_at }
// Error 403 if access denied

// PUT /api/phase-reports/update
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, content }
// UPDATE phase_report SET content = ? WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, content, updated_at }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { isPhaseInPMProject } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, sql } from "drizzle-orm";

// GET /api/phase-reports
// Allowed Roles: project_manager, hr_executive
// Returns phase reports with project and phase details
// - hr_executive: Can view all phase reports
// - project_manager: Can only view phase reports for their projects
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Build where conditions
    const whereConditions = [];

    // If project manager, only show reports for their projects
    if (checkRole(user, ["project_manager"])) {
      whereConditions.push(eq(schema.projects.project_manager_id, user.id));
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Build query to fetch phase reports with project and phase details
    const reports = await db
      .select({
        id: schema.phaseReports.id,
        phase_id: schema.phaseReports.phase_id,
        content: schema.phaseReports.content,
        submitted_by: schema.phaseReports.submitted_by,
        submitted_at: schema.phaseReports.submitted_at,
        phase_name: schema.phases.phase_name,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        submitter_name: schema.employees.full_name,
      })
      .from(schema.phaseReports)
      .innerJoin(
        schema.phases,
        eq(schema.phaseReports.phase_id, schema.phases.id),
      )
      .innerJoin(
        schema.projects,
        eq(schema.phases.project_id, schema.projects.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.phaseReports.submitted_by, schema.employees.id),
      )
      .where(whereClause)
      .orderBy(sql`${schema.phaseReports.submitted_at} DESC`);

    return successResponse(reports);
  } catch (error) {
    console.error("Error fetching phase reports:", error);
    return ErrorResponses.internalError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { phase_id, content } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["phase_id", "content"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Project manager validation
    if (checkRole(user, ["project_manager"])) {
      const isPMPhase = await isPhaseInPMProject(phase_id, user.id);
      if (!isPMPhase) {
        return ErrorResponses.accessDenied();
      }
    }

    // Insert phase report
    const [report] = await db
      .insert(schema.phaseReports)
      .values({
        phase_id,
        content,
        submitted_by: user.id,
        submitted_at: new Date(),
      })
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "PHASE_REPORT",
      entity_id: report.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: {
        phase_id,
        content,
      },
    });

    return successResponse(
      {
        id: report.id,
        phase_id: report.phase_id,
        content: report.content,
        submitted_by: report.submitted_by,
        submitted_at: report.submitted_at,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating phase report:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, content } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id", "content"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check if report exists
    const [existingReport] = await db
      .select()
      .from(schema.phaseReports)
      .where(eq(schema.phaseReports.id, id));

    if (!existingReport) {
      return ErrorResponses.notFound("Phase report");
    }

    // Update phase report
    const [updated] = await db
      .update(schema.phaseReports)
      .set({ content })
      .where(eq(schema.phaseReports.id, id))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "PHASE_REPORT",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: { content },
    });

    return successResponse({
      id: updated.id,
      content: updated.content,
      updated_at: updated.submitted_at, // Using submitted_at as there's no updated_at field
    });
  } catch (error) {
    console.error("Error updating phase report:", error);
    return ErrorResponses.internalError();
  }
}
