// POST /api/projects/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { project_code, project_name, client_id, project_manager_id, started_on }
// Check project_code uniqueness, return 400 "project_code already exists" if exists
// INSERT into projects table with status = 'DRAFT'
// INSERT audit log with operation='INSERT', changed_by=current_user_id
// Return: { id, project_code, project_name, client_id, project_manager_id, status, started_on }

// GET /api/projects/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: status, project_manager_id, page, limit
// Data Filtering (all roles can view all projects in list):
//   - employee: Returns all projects
//   - project_manager: Returns all projects
//   - hr_executive: Returns all projects
// SELECT * FROM projects WHERE filters applied
// JOIN clients table to get client_name
// JOIN employees table to get project_manager_name
// Apply pagination using LIMIT and OFFSET
// Return: { projects: [{ id, project_code, project_name, client_id, client_name, project_manager_id, project_manager_name, status, started_on, closed_on }], total, page, limit }

// GET /api/projects/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE id IN (SELECT project_id FROM project_allocation WHERE emp_id = current_user_id), else return 403
//   - project_manager: Can view WHERE project_manager_id = current_user_id, else return 403
//   - hr_executive: Can view any project
// SELECT * FROM projects WHERE id = ?
// JOIN clients table to get client_name
// JOIN employees table to get project_manager_name
// Return: { id, project_code, project_name, client_id, client_name, short_description, long_description, pitch_deck_url, github_url, project_manager_id, project_manager_name, status, started_on, closed_on }
// Error 403 if access denied
// Error 404 if project not found

// PUT /api/projects/update
// Allowed Roles: project_manager, hr_executive
// Accept (project_manager): { id, short_description, long_description, pitch_deck_url, github_url, status }
// Accept (hr_executive): { id, project_name, client_id, short_description, long_description, pitch_deck_url, github_url, project_manager_id, status, started_on }
// Validation (project_manager):
//   - Can update WHERE project_manager_id = current_user_id, else return 403 "Access denied. Not your project"
//   - Can update ONLY: short_description, long_description, pitch_deck_url, github_url, status
//   - Cannot update: project_code, project_name, client_id, project_manager_id, started_on
//   - If trying to update restricted fields, return 403 "Cannot update project_name. HR only"
//   - Status transitions allowed: DRAFT→ACTIVE, ACTIVE→ON_HOLD, ON_HOLD→ACTIVE
//   - Cannot transition to COMPLETED or CANCELLED, return 400 "Invalid status transition from DRAFT to COMPLETED"
// Validation (hr_executive):
//   - Can update all fields except project_code
//   - If trying to update project_code, return 400 "Cannot update project_code"
//   - All status transitions allowed
// UPDATE projects SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, project_code, project_name, status }

// GET /api/projects/status-transitions
// Allowed Roles: project_manager, hr_executive
// Query params: current_status, role
// Logic:
//   - If role = 'project_manager':
//     - DRAFT → ["ACTIVE"]
//     - ACTIVE → ["ON_HOLD"]
//     - ON_HOLD → ["ACTIVE"]
//   - If role = 'hr_executive':
//     - DRAFT → ["ACTIVE"]
//     - ACTIVE → ["ON_HOLD", "COMPLETED", "CANCELLED"]
//     - ON_HOLD → ["ACTIVE", "COMPLETED", "CANCELLED"]
// Return: { current_status, allowed_transitions: [...] }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import { checkUniqueness, getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  getPaginationParams,
  successResponse,
  validateStatusTransition,
  getAllowedStatusTransitions,
} from "@/lib/api-helpers";
import { eq, and, gt, inArray, sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const {
      project_code,
      project_name,
      client_id,
      project_manager_id,
      started_on,
    } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "project_code",
      "project_name",
      "project_manager_id",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check uniqueness
    const isCodeUnique = await checkUniqueness(
      schema.projects,
      schema.projects.project_code,
      project_code,
    );
    if (!isCodeUnique) {
      return ErrorResponses.conflict("project_code already exists");
    }

    // Insert project
    const [project] = await db
      .insert(schema.projects)
      .values({
        project_code,
        project_name,
        client_id,
        project_manager_id,
        status: "DRAFT",
        started_on: started_on ? toDateString(started_on) : null,
      })
      .returning();

    await createAuditLog({
      entity_type: "PROJECT",
      entity_id: project.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: project,
    });

    return successResponse(
      {
        id: project.id,
        project_code: project.project_code,
        project_name: project.project_name,
        client_id: project.client_id,
        project_manager_id: project.project_manager_id,
        status: project.status,
        started_on: project.started_on,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating project:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Handle status transitions endpoint
    if (action === "status-transitions") {
      return handleStatusTransitions(req, user, searchParams);
    }

    // Handle single project retrieval
    if (action === "get") {
      return handleGetProject(req, user, searchParams);
    }

    // Handle list projects
    return handleListProjects(req, user, searchParams);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return ErrorResponses.internalError();
  }
}

async function handleGetProject(
  req: NextRequest,
  user: any,
  searchParams: URLSearchParams,
) {
  const id = searchParams.get("id");

  if (!id) {
    return ErrorResponses.badRequest("Project id is required");
  }

  // Check permissions based on role
  if (user.employee_role === "employee") {
    // Check if employee is allocated to this project
    const [allocation] = await db
      .select({ project_id: schema.projectAllocation.project_id })
      .from(schema.projectAllocation)
      .where(
        and(
          eq(schema.projectAllocation.emp_id, user.id),
          eq(schema.projectAllocation.project_id, id),
        ),
      )
      .limit(1);

    if (!allocation) {
      return ErrorResponses.accessDenied();
    }
  } else if (user.employee_role === "project_manager") {
    // Check if this is their project
    const [project] = await db
      .select({ project_manager_id: schema.projects.project_manager_id })
      .from(schema.projects)
      .where(eq(schema.projects.id, id));

    if (!project || project.project_manager_id !== user.id) {
      return ErrorResponses.accessDenied();
    }
  }

  // Fetch project with joins
  const [project] = await db
    .select({
      id: schema.projects.id,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      client_id: schema.projects.client_id,
      client_name: schema.clients.client_name,
      short_description: schema.projects.short_description,
      long_description: schema.projects.long_description,
      pitch_deck_url: schema.projects.pitch_deck_url,
      github_url: schema.projects.github_url,
      project_manager_id: schema.projects.project_manager_id,
      project_manager_name: schema.employees.full_name,
      status: schema.projects.status,
      started_on: schema.projects.started_on,
      closed_on: schema.projects.closed_on,
    })
    .from(schema.projects)
    .leftJoin(schema.clients, eq(schema.projects.client_id, schema.clients.id))
    .leftJoin(
      schema.employees,
      eq(schema.projects.project_manager_id, schema.employees.id),
    )
    .where(eq(schema.projects.id, id));

  if (!project) {
    return ErrorResponses.notFound("Project");
  }

  return successResponse(project);
}

async function handleListProjects(
  req: NextRequest,
  user: any,
  searchParams: URLSearchParams,
) {
  const status = searchParams.get("status");
  const project_manager_id = searchParams.get("project_manager_id");
  const pm_scope = searchParams.get("pm_scope");
  const search = searchParams.get("search");
  const { page, limit, offset } = getPaginationParams(new URL(req.url));

  const whereConditions: any[] = [];

  if (status) {
    whereConditions.push(eq(schema.projects.status, status as any));
  }

  if (project_manager_id) {
    whereConditions.push(
      eq(schema.projects.project_manager_id, project_manager_id),
    );
  }

  if (user.employee_role === "project_manager" && pm_scope === "my_team") {
    const [managedProjects, directReports] = await Promise.all([
      db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id)),
      db
        .select({ id: schema.employees.id })
        .from(schema.employees)
        .where(eq(schema.employees.reporting_manager_id, user.id)),
    ]);

    const reporteeIds = directReports.map((r) => r.id);
    let reporteeProjectIds: string[] = [];

    if (reporteeIds.length > 0) {
      const reporteeProjects = await db
        .selectDistinct({ project_id: schema.projectAllocation.project_id })
        .from(schema.projectAllocation)
        .where(inArray(schema.projectAllocation.emp_id, reporteeIds));
      reporteeProjectIds = reporteeProjects.map((p) => p.project_id);
    }

    const visibleProjectIds = [
      ...new Set([
        ...managedProjects.map((p) => p.id),
        ...reporteeProjectIds,
      ]),
    ];

    if (visibleProjectIds.length === 0) {
      return successResponse({ projects: [], total: 0, page, limit });
    }

    whereConditions.push(inArray(schema.projects.id, visibleProjectIds));
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereConditions.push(
      sql`(
        LOWER(${schema.projects.project_name}) LIKE ${searchTerm} OR
        LOWER(${schema.projects.project_code}) LIKE ${searchTerm} OR
        LOWER(${schema.clients.client_name}) LIKE ${searchTerm}
      )`,
    );
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count with joins for search
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.projects)
    .leftJoin(schema.clients, eq(schema.projects.client_id, schema.clients.id))
    .leftJoin(
      schema.employees,
      eq(schema.projects.project_manager_id, schema.employees.id),
    )
    .where(whereClause);
  const total = Number(countResult.count);

  // Get projects with joins
  const projects = await db
    .select({
      id: schema.projects.id,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      client_id: schema.projects.client_id,
      client_name: schema.clients.client_name,
      project_manager_id: schema.projects.project_manager_id,
      project_manager_name: schema.employees.full_name,
      status: schema.projects.status,
      started_on: schema.projects.started_on,
      closed_on: schema.projects.closed_on,
    })
    .from(schema.projects)
    .leftJoin(schema.clients, eq(schema.projects.client_id, schema.clients.id))
    .leftJoin(
      schema.employees,
      eq(schema.projects.project_manager_id, schema.employees.id),
    )
    .where(whereClause)
    .orderBy(schema.projects.project_name)
    .limit(limit)
    .offset(offset);

  return successResponse({ projects, total, page, limit });
}

async function handleStatusTransitions(
  req: NextRequest,
  user: any,
  searchParams: URLSearchParams,
) {
  const current_status = searchParams.get("current_status");
  const role = searchParams.get("role") || user.employee_role;

  if (!current_status) {
    return ErrorResponses.badRequest("current_status is required");
  }

  const allowed_transitions = getAllowedStatusTransitions(current_status, role);

  return successResponse({
    current_status,
    allowed_transitions,
  });
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const {
      id,
      project_code,
      project_name,
      client_id,
      short_description,
      long_description,
      pitch_deck_url,
      github_url,
      project_manager_id,
      status,
      started_on,
    } = body;

    if (!id) {
      return ErrorResponses.badRequest("Project id is required");
    }

    // Get current project
    const [currentProject] = await db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, id));

    if (!currentProject) {
      return ErrorResponses.notFound("Project");
    }

    // Role-specific validations
    if (user.employee_role === "project_manager") {
      // Check ownership
      if (currentProject.project_manager_id !== user.id) {
        return ErrorResponses.accessDenied();
      }

      // Check for restricted fields
      const restrictedFields = [
        "project_code",
        "project_name",
        "client_id",
        "project_manager_id",
        "started_on",
      ];
      for (const field of restrictedFields) {
        if (body[field] !== undefined) {
          return NextResponse.json(
            { error: `Cannot update ${field}. HR only` },
            { status: 403 },
          );
        }
      }

      // Validate status transition if status is being changed
      if (status && status !== currentProject.status) {
        const validation = validateStatusTransition(
          currentProject.status,
          status,
          "project_manager",
        );
        if (!validation.valid) {
          return ErrorResponses.badRequest(validation.error!);
        }
      }
    } else if (user.employee_role === "hr_executive") {
      // HR cannot update project_code
      if (project_code !== undefined) {
        return ErrorResponses.badRequest("Cannot update project_code");
      }

      // Validate status transition if status is being changed
      if (status && status !== currentProject.status) {
        const validation = validateStatusTransition(
          currentProject.status,
          status,
          "hr_executive",
        );
        if (!validation.valid) {
          return ErrorResponses.badRequest(validation.error!);
        }
      }
    }

    // Build update data
    const updateData: any = { updated_at: new Date() };

    if (project_name !== undefined) updateData.project_name = project_name;
    if (client_id !== undefined) updateData.client_id = client_id;
    if (short_description !== undefined)
      updateData.short_description = short_description;
    if (long_description !== undefined)
      updateData.long_description = long_description;
    if (pitch_deck_url !== undefined)
      updateData.pitch_deck_url = pitch_deck_url;
    if (github_url !== undefined) updateData.github_url = github_url;
    if (project_manager_id !== undefined)
      updateData.project_manager_id = project_manager_id;
    if (status !== undefined) updateData.status = status;
    if (started_on !== undefined)
      updateData.started_on = toDateString(started_on);

    const [updated] = await db
      .update(schema.projects)
      .set(updateData)
      .where(eq(schema.projects.id, id))
      .returning();

    await createAuditLog({
      entity_type: "PROJECT",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: updateData,
    });

    return successResponse({
      id: updated.id,
      project_code: updated.project_code,
      project_name: updated.project_name,
      status: updated.status,
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return ErrorResponses.internalError();
  }
}
