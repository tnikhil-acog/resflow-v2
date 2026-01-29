// POST /api/phases/create
// Allowed Roles: project_manager, hr_executive
// Accept: { project_id, phase_name, phase_description }
// Validation:
//   - project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403 "Access denied. Not your project"
//   - hr_executive: Can create for any project
// INSERT into phase table
// Return: { id, project_id, phase_name, phase_description, created_at }

// GET /api/phases/list
// Allowed Roles: employee, project_manager, hr_executive
// Query param: project_id (required)
// Data Filtering:
//   - employee: Returns WHERE project_id IN (SELECT project_id FROM project_allocation WHERE emp_id = current_user_id), else return 403
//   - project_manager: Returns WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403
//   - hr_executive: Returns all phases
// SELECT * FROM phase WHERE project_id = ?
// JOIN projects table to get project_code, project_name
// Return: { phases: [{ id, project_id, project_code, project_name, phase_name, phase_description, created_at }] }
// Error 403 if access denied

// PUT /api/phases/update
// Allowed Roles: project_manager, hr_executive
// Accept: { id, phase_name, phase_description }
// Validation:
//   - project_manager: Can update WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403
//   - hr_executive: Can update any phase
// UPDATE phase SET phase_name = ?, phase_description = ? WHERE id = ?
// Return: { id, phase_name, phase_description }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  isProjectManager,
  isEmployeeOnProject,
  isPhaseInPMProject,
} from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, sql, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { project_id, phase_name, phase_description } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "project_id",
      "phase_name",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Project manager validation
    if (checkRole(user, ["project_manager"])) {
      const isPM = await isProjectManager(project_id, user.id);
      if (!isPM) {
        return ErrorResponses.badRequest("Access denied. Not your project");
      }
    }

    // Insert phase
    const [phase] = await db
      .insert(schema.phases)
      .values({
        project_id,
        phase_name,
        phase_description: phase_description || null,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "PHASE",
      entity_id: phase.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: {
        project_id,
        phase_name,
        phase_description,
      },
    });

    return successResponse(
      {
        id: phase.id,
        project_id: phase.project_id,
        phase_name: phase.phase_name,
        phase_description: phase.phase_description,
        created_at: phase.created_at,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating phase:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");

    // project_id is required
    if (!project_id) {
      return ErrorResponses.badRequest("project_id is required");
    }

    // Check access based on role
    if (checkRole(user, ["employee"])) {
      // Employee must be allocated to the project
      const isOnProject = await isEmployeeOnProject(user.id, project_id);
      if (!isOnProject) {
        return ErrorResponses.accessDenied();
      }
    } else if (checkRole(user, ["project_manager"])) {
      // PM must manage the project
      const isPM = await isProjectManager(project_id, user.id);
      if (!isPM) {
        return ErrorResponses.accessDenied();
      }
    }
    // hr_executive can access any project

    // Get phases with project info and phase reports
    const phasesData = await db
      .select({
        id: schema.phases.id,
        project_id: schema.phases.project_id,
        phase_name: schema.phases.phase_name,
        phase_description: schema.phases.phase_description,
        created_at: schema.phases.created_at,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
      })
      .from(schema.phases)
      .innerJoin(
        schema.projects,
        eq(schema.phases.project_id, schema.projects.id),
      )
      .where(eq(schema.phases.project_id, project_id));

    // Get phase reports for all phases
    const phaseIds = phasesData.map((p) => p.id);
    let reportsData: any[] = [];
    if (phaseIds.length > 0) {
      reportsData = await db
        .select({
          id: schema.phaseReports.id,
          phase_id: schema.phaseReports.phase_id,
          content: schema.phaseReports.content,
          submitted_by: schema.phaseReports.submitted_by,
          submitted_at: schema.phaseReports.submitted_at,
          submitter: {
            id: schema.employees.id,
            employee_name: schema.employees.full_name,
            employee_code: schema.employees.employee_code,
          },
        })
        .from(schema.phaseReports)
        .innerJoin(
          schema.employees,
          eq(schema.phaseReports.submitted_by, schema.employees.id),
        )
        .where(
          sql`${schema.phaseReports.phase_id} IN (${phaseIds.join(", ")})`,
        );
    }

    // Combine phases with their reports
    const phases = phasesData.map((phase) => ({
      ...phase,
      reports: reportsData.filter((r) => r.phase_id === phase.id),
    }));

    return successResponse(phases);
  } catch (error) {
    console.error("Error fetching phases:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, phase_name, phase_description } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id", "phase_name"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get phase to check project ownership
    const [phase] = await db
      .select()
      .from(schema.phases)
      .where(eq(schema.phases.id, id));

    if (!phase) {
      return ErrorResponses.notFound("Phase");
    }

    // Project manager validation
    if (checkRole(user, ["project_manager"])) {
      const isPM = await isProjectManager(phase.project_id, user.id);
      if (!isPM) {
        return ErrorResponses.accessDenied();
      }
    }

    // Update phase
    const [updated] = await db
      .update(schema.phases)
      .set({
        phase_name,
        phase_description: phase_description || null,
      })
      .where(eq(schema.phases.id, id))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "PHASE",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        phase_name,
        phase_description,
      },
    });

    return successResponse({
      id: updated.id,
      phase_name: updated.phase_name,
      phase_description: updated.phase_description,
    });
  } catch (error) {
    console.error("Error updating phase:", error);
    return ErrorResponses.internalError();
  }
}
