/**
 * Demands API Routes
 *
 * POST /api/demands - Create new demand
 * GET /api/demands?id={id} - Get single demand by ID ✓ IMPLEMENTED
 * GET /api/demands - List demands with filters
 * PUT /api/demands - Update demand (PM: REQUESTED status only)
 *
 * Allowed Roles:
 * - POST: project_manager (own projects), hr_executive (all)
 * - GET single: project_manager (own), hr_executive (all)
 * - GET list: project_manager (own), hr_executive (all)
 * - PUT: project_manager (own, REQUESTED only)
 */

// POST /api/demands/create
// Allowed Roles: project_manager, hr_executive
// Accept: { project_id, role_required, skill_ids: string[], start_date }
// Validation:
//   - project_manager: Can create WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id), else return 403 "Access denied. Not your project"
//   - hr_executive: Can create for any project
//   - skill_ids must be array of valid skill IDs
// Transaction:
//   1. INSERT into resource_demands table with requested_by = current_user_id, demand_status = 'REQUESTED'
//   2. For each skill_id in skill_ids: INSERT into demand_skills (demand_id, skill_id)
// Return: { id, project_id, role_required, skill_ids, start_date, requested_by, demand_status, created_at }

// GET /api/demands/list
// Allowed Roles: project_manager, hr_executive
// Query params: project_id, demand_status, requested_by, page, limit
// Data Filtering:
//   - project_manager: Returns WHERE requested_by = current_user_id
//   - hr_executive: Returns all demands
// SELECT * FROM resource_demands WHERE filters applied
// JOIN projects table to get project_code, project_name
// JOIN employees table to get requested_by_name (full_name)
// JOIN demand_skills and skills tables to get skill names array
//   - SELECT ds.demand_id, array_agg(s.skill_name) as skill_names FROM demand_skills ds JOIN skills s ON ds.skill_id = s.id GROUP BY ds.demand_id
// Apply pagination using LIMIT and OFFSET
// Return: { demands: [{ id, project_id, project_code, project_name, role_required, skill_names, start_date, requested_by, requested_by_name, demand_status, created_at }], total, page, limit }

// GET /api/demands/get
// Allowed Roles: project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - project_manager: Can view WHERE requested_by = current_user_id, else return 403
//   - hr_executive: Can view any demand
// SELECT * FROM resource_demands WHERE id = ?
// JOIN projects table to get project_code, project_name
// JOIN employees table to get requested_by_name (full_name)
// JOIN demand_skills and skills tables to get skill names array
// Return: { id, project_id, project_code, project_name, role_required, skill_names, start_date, requested_by, requested_by_name, demand_status, created_at }
// Error 403 if access denied
// Error 404 if demand not found

// PUT /api/demands/update
// Allowed Roles: project_manager (only if demand_status = 'REQUESTED')
// Accept: { id, role_required, skill_ids: string[], start_date }
// Get demand: SELECT requested_by, demand_status FROM resource_demands WHERE id = ?
// Validation:
//   - project_manager: Can update WHERE requested_by = current_user_id AND demand_status = 'REQUESTED', else return 403 "Cannot edit demand after HR review"
//   - demand_status must be 'REQUESTED', else return 400 "Cannot edit demand. Status: FULFILLED/CANCELLED"
// Transaction:
//   1. UPDATE resource_demands SET role_required = ?, start_date = ? WHERE id = ?
//   2. DELETE FROM demand_skills WHERE demand_id = ?
//   3. For each skill_id in skill_ids: INSERT into demand_skills (demand_id, skill_id)
// Return: { id, role_required, skill_ids, start_date }
// Error 403 if access denied

// POST /api/demands/approve
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, action: "approve" | "reject" }
// Get demand: SELECT id, demand_status FROM resource_demands WHERE id = ?
// If action = "approve":
//   - UPDATE resource_demands SET demand_status = 'FULFILLED' WHERE id = ?
// If action = "reject":
//   - UPDATE resource_demands SET demand_status = 'CANCELLED' WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, demand_status }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import {
  getCount,
  isProjectManager,
  getDemandSkillsMap,
} from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  getPaginationParams,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { project_id, role_required, skill_ids, start_date } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "project_id",
      "role_required",
      "skill_ids",
      "start_date",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate skill_ids is an array
    if (!Array.isArray(skill_ids) || skill_ids.length === 0) {
      return ErrorResponses.badRequest(
        "skill_ids must be a non-empty array of skill IDs",
      );
    }

    // Project manager validation
    if (checkRole(user, ["project_manager"])) {
      const isPM = await isProjectManager(project_id, user.id);
      if (!isPM) {
        return ErrorResponses.badRequest("Access denied. Not your project");
      }
    }

    const startDateStr = toDateString(start_date);

    // Transaction: Create demand and add skills
    const result = await db.transaction(async (tx) => {
      // Insert demand
      const [demand] = await tx
        .insert(schema.resourceDemands)
        .values({
          project_id,
          role_required,
          start_date: startDateStr!,
          requested_by: user.id,
          demand_status: "REQUESTED",
        })
        .returning();

      // Insert demand skills
      if (skill_ids.length > 0) {
        await tx.insert(schema.demandSkills).values(
          skill_ids.map((skill_id: string) => ({
            demand_id: demand.id,
            skill_id,
          })),
        );
      }

      return demand;
    });

    // Create audit log
    await createAuditLog({
      entity_type: "DEMAND",
      entity_id: result.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: {
        project_id,
        role_required,
        skill_ids,
        start_date: startDateStr,
        demand_status: "REQUESTED",
      },
    });

    // Get project details for task description
    const [projectDetails] = await db
      .select({
        project_name: schema.projects.project_name,
        project_code: schema.projects.project_code,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, project_id));

    // Get requester details for task description
    const [requesterDetails] = await db
      .select({
        full_name: schema.employees.full_name,
        employee_code: schema.employees.employee_code,
      })
      .from(schema.employees)
      .where(eq(schema.employees.id, user.id));

    // Get skill names for task description
    const skillNames = await db
      .select({
        skill_name: schema.skills.skill_name,
      })
      .from(schema.skills)
      .where(inArray(schema.skills.skill_id, skill_ids));

    const skillNamesStr = skillNames.map((s) => s.skill_name).join(", ");

    // Get all HR executives to assign the task
    const hrExecutives = await db
      .select({
        id: schema.employees.id,
      })
      .from(schema.employees)
      .where(
        and(
          eq(schema.employees.employee_role, "HR"),
          eq(schema.employees.status, "ACTIVE"),
        ),
      );

    // Create a task for each HR executive
    const taskDescription = `Review resource demand: ${requesterDetails?.full_name || "PM"} (${requesterDetails?.employee_code || user.id}) requested ${role_required} for "${projectDetails?.project_name || project_id}" (Skills: ${skillNamesStr || "N/A"}) starting ${startDateStr}`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    for (const hr of hrExecutives) {
      await db.insert(schema.tasks).values({
        owner_id: hr.id,
        entity_type: "DEMAND",
        entity_id: result.id,
        description: taskDescription,
        due_on: dueDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
        assigned_by: user.id,
        status: "DUE",
      });
    }

    return successResponse(
      {
        id: result.id,
        project_id: result.project_id,
        role_required: result.role_required,
        skill_ids,
        start_date: result.start_date,
        requested_by: result.requested_by,
        demand_status: result.demand_status,
        created_at: result.created_at,
        message: `Demand created successfully. ${hrExecutives.length} approval task(s) created for HR.`,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating demand:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = getPaginationParams(new URL(req.url));

    const id = searchParams.get("id");

    // If id is provided, return single demand
    if (id) {
      return await getSingleDemand(id, user);
    }

    // Otherwise, return list
    return await getDemandsList(user, searchParams, page, limit, offset);
  } catch (error) {
    console.error("Error fetching demands:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, role_required, skill_ids, start_date } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "id",
      "role_required",
      "skill_ids",
      "start_date",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate skill_ids is an array
    if (!Array.isArray(skill_ids) || skill_ids.length === 0) {
      return ErrorResponses.badRequest(
        "skill_ids must be a non-empty array of skill IDs",
      );
    }

    // Get demand
    const [demand] = await db
      .select()
      .from(schema.resourceDemands)
      .where(eq(schema.resourceDemands.id, id));

    if (!demand) {
      return ErrorResponses.notFound("Demand");
    }

    // Validate ownership
    if (demand.requested_by !== user.id) {
      return ErrorResponses.badRequest("Cannot edit demand after HR review");
    }

    // Validate status
    if (demand.demand_status !== "REQUESTED") {
      return ErrorResponses.badRequest(
        `Cannot edit demand. Status: ${demand.demand_status}`,
      );
    }

    const startDateStr = toDateString(start_date);

    // Transaction: Update demand and replace skills
    await db.transaction(async (tx) => {
      // Update demand
      await tx
        .update(schema.resourceDemands)
        .set({
          role_required,
          start_date: startDateStr!,
        })
        .where(eq(schema.resourceDemands.id, id));

      // Delete existing skills
      await tx
        .delete(schema.demandSkills)
        .where(eq(schema.demandSkills.demand_id, id));

      // Insert new skills
      if (skill_ids.length > 0) {
        await tx.insert(schema.demandSkills).values(
          skill_ids.map((skill_id: string) => ({
            demand_id: id,
            skill_id,
          })),
        );
      }
    });

    // Create audit log
    await createAuditLog({
      entity_type: "DEMAND",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: {
        role_required,
        skill_ids,
        start_date: startDateStr,
      },
    });

    return successResponse({
      id,
      role_required,
      skill_ids,
      start_date: startDateStr,
    });
  } catch (error) {
    console.error("Error updating demand:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * Get single demand by ID
 */
async function getSingleDemand(id: string, user: any) {
  // Get demand with joins
  const [demand] = await db
    .select({
      id: schema.resourceDemands.id,
      project_id: schema.resourceDemands.project_id,
      role_required: schema.resourceDemands.role_required,
      start_date: schema.resourceDemands.start_date,
      requested_by: schema.resourceDemands.requested_by,
      demand_status: schema.resourceDemands.demand_status,
      created_at: schema.resourceDemands.created_at,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      requested_by_name: schema.employees.full_name,
    })
    .from(schema.resourceDemands)
    .innerJoin(
      schema.projects,
      eq(schema.resourceDemands.project_id, schema.projects.id),
    )
    .innerJoin(
      schema.employees,
      eq(schema.resourceDemands.requested_by, schema.employees.id),
    )
    .where(eq(schema.resourceDemands.id, id));

  if (!demand) {
    return ErrorResponses.notFound("Demand");
  }

  // Check access
  if (checkRole(user, ["project_manager"])) {
    if (demand.requested_by !== user.id) {
      return ErrorResponses.accessDenied();
    }
  }

  // Get skill names
  const skillsMap = await getDemandSkillsMap([id]);
  const skill_names = skillsMap[id] || [];

  return successResponse({
    id: demand.id,
    project_id: demand.project_id,
    project_code: demand.project_code,
    project_name: demand.project_name,
    role_required: demand.role_required,
    skill_names,
    start_date: demand.start_date,
    requested_by: demand.requested_by,
    requested_by_name: demand.requested_by_name,
    demand_status: demand.demand_status,
    created_at: demand.created_at,
  });
}

/**
 * Get list of demands with filters
 */
async function getDemandsList(
  user: any,
  searchParams: URLSearchParams,
  page: number,
  limit: number,
  offset: number,
) {
  const filters: any[] = [];

  // Role-based filtering
  if (checkRole(user, ["project_manager"])) {
    filters.push(eq(schema.resourceDemands.requested_by, user.id));
  }
  // hr_executive can see all demands (no filter)

  // Optional filters
  const project_id = searchParams.get("project_id");
  if (project_id) {
    filters.push(eq(schema.resourceDemands.project_id, project_id));
  }

  const demand_status = searchParams.get("demand_status");
  if (demand_status) {
    filters.push(
      eq(
        schema.resourceDemands.demand_status,
        demand_status as "REQUESTED" | "FULFILLED" | "CANCELLED",
      ),
    );
  }

  const requested_by = searchParams.get("requested_by");
  if (requested_by) {
    filters.push(eq(schema.resourceDemands.requested_by, requested_by));
  }

  // Get total count
  const total = await getCount(
    schema.resourceDemands,
    filters.length > 0 ? and(...filters) : undefined,
  );

  // Get demands with joins
  const demands = await db
    .select({
      id: schema.resourceDemands.id,
      project_id: schema.resourceDemands.project_id,
      role_required: schema.resourceDemands.role_required,
      start_date: schema.resourceDemands.start_date,
      requested_by: schema.resourceDemands.requested_by,
      demand_status: schema.resourceDemands.demand_status,
      created_at: schema.resourceDemands.created_at,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      requested_by_name: schema.employees.full_name,
    })
    .from(schema.resourceDemands)
    .innerJoin(
      schema.projects,
      eq(schema.resourceDemands.project_id, schema.projects.id),
    )
    .innerJoin(
      schema.employees,
      eq(schema.resourceDemands.requested_by, schema.employees.id),
    )
    .where(filters.length > 0 ? and(...filters) : undefined)
    .limit(limit)
    .offset(offset);

  // Get skill names for all demands
  const demandIds = demands.map((d) => d.id);
  const skillsMap = await getDemandSkillsMap(demandIds);

  // Format response
  const formattedDemands = demands.map((d) => ({
    id: d.id,
    project_id: d.project_id,
    project_code: d.project_code,
    project_name: d.project_name,
    role_required: d.role_required,
    skill_names: skillsMap[d.id] || [],
    start_date: d.start_date,
    requested_by: d.requested_by,
    requested_by_name: d.requested_by_name,
    demand_status: d.demand_status,
    created_at: d.created_at,
  }));

  return successResponse({
    demands: formattedDemands,
    total,
    page,
    limit,
  });
}
