// GET /api/phase-reports/[id]
// Allowed Roles: project_manager, hr_executive, employee (only own reports)
// Returns a single phase report with all details
// - employee: Can only view reports they submitted
// - project_manager: Can view reports for their projects
// - hr_executive: Can view all reports

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser(req);
    const id = params.id;

    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Build where conditions
    const whereConditions = [eq(schema.phaseReports.id, id)];

    // Employees can only view reports they submitted
    if (checkRole(user, ["employee"])) {
      whereConditions.push(eq(schema.phaseReports.submitted_by, user.id));
    }

    // Project managers can only view reports for their projects
    if (checkRole(user, ["project_manager"])) {
      // We'll handle this after fetching the report to check project PM
    }

    // Fetch the report with related details
    const [report] = await db
      .select({
        id: schema.phaseReports.id,
        phase_id: schema.phaseReports.phase_id,
        content: schema.phaseReports.content,
        submitted_by: schema.phaseReports.submitted_by,
        submitted_at: schema.phaseReports.submitted_at,
        phase_name: schema.phases.phase_name,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        project_id: schema.projects.id,
        project_manager_id: schema.projects.project_manager_id,
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
      .where(and(...whereConditions));

    if (!report) {
      return ErrorResponses.notFound("Phase report");
    }

    // Additional authorization check for project managers
    if (
      checkRole(user, ["project_manager"]) &&
      report.project_manager_id !== user.id
    ) {
      return ErrorResponses.accessDenied();
    }

    return successResponse({
      id: report.id,
      phase_id: report.phase_id,
      content: report.content,
      submitted_by: report.submitted_by,
      submitted_at: report.submitted_at,
      phase_name: report.phase_name,
      project_code: report.project_code,
      project_name: report.project_name,
      submitter_name: report.submitter_name,
    });
  } catch (error) {
    console.error("Error fetching phase report:", error);
    return ErrorResponses.internalError();
  }
}
