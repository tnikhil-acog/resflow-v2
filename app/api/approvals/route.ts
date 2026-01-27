// GET /api/approvals/list
// Allowed Roles: project_manager, hr_executive
// Query params: type, page, limit
// type parameter values: "skill", "demand" (no default, must be specified)
// Data Filtering:
//   - project_manager:
//     - Skills: Returns pending skill requests WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)) AND approved_by IS NULL
//     - Demands: No access (empty array)
//   - hr_executive:
//     - Skills: Returns all pending skill requests WHERE approved_by IS NULL
//     - Demands: Returns all demands WHERE demand_status = 'REQUESTED'
//
// For Skills:
//   - SELECT * FROM employee_skills WHERE approved_by IS NULL AND approved_at IS NULL (PENDING)
//   - JOIN employees table to get employee_code, employee_name (full_name)
//   - JOIN skills table to get skill_name, skill_department
// For Demands (hr_executive only):
//   - SELECT * FROM resource_demands WHERE demand_status = 'REQUESTED'
//   - JOIN projects table to get project_code, project_name
//   - JOIN employees table to get requested_by_name (full_name)
// Apply pagination using LIMIT and OFFSET
// Return: {
//   approvals: [
//     { id, type: "skill", emp_id, employee_code, employee_name, skill_id, skill_name, proficiency_level, requested_at },
//     { id, type: "demand", project_id, project_code, project_name, role_required, requested_by, requested_by_name, start_date, status }
//   ],
//   total, page, limit
// }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { getCount, getPMTeamMemberIds } from "@/lib/db-helpers";
import {
  ErrorResponses,
  getPaginationParams,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, isNull, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only project_manager and hr_executive can access approvals
    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = getPaginationParams(new URL(req.url));

    const type = searchParams.get("type");

    // Type is required
    if (!type) {
      return ErrorResponses.badRequest(
        "type parameter is required (skill or demand)",
      );
    }

    if (type === "skill") {
      return await handleSkillApprovals(user, page, limit, offset);
    } else if (type === "demand") {
      return await handleDemandApprovals(user, page, limit, offset);
    } else {
      return ErrorResponses.badRequest(
        "Invalid type. Must be 'skill' or 'demand'",
      );
    }
  } catch (error) {
    console.error("Error fetching approvals:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * Handle skill approval requests
 */
async function handleSkillApprovals(
  user: any,
  page: number,
  limit: number,
  offset: number,
) {
  const filters: any[] = [
    isNull(schema.employeeSkills.approved_by),
    isNull(schema.employeeSkills.approved_at),
  ];

  // Role-based filtering
  if (checkRole(user, ["project_manager"])) {
    // Get team member IDs
    const teamEmpIds = await getPMTeamMemberIds(user.id);
    filters.push(inArray(schema.employeeSkills.emp_id, teamEmpIds));
  }
  // hr_executive gets all pending skills (no additional filter)

  // Get total count
  const total = await getCount(schema.employeeSkills, and(...filters));

  // Get pending skill approvals
  const skillApprovals = await db
    .select({
      id: schema.employeeSkills.id,
      emp_id: schema.employeeSkills.emp_id,
      skill_id: schema.employeeSkills.skill_id,
      proficiency_level: schema.employeeSkills.proficiency_level,
      created_at: schema.employeeSkills.created_at,
      employee_code: schema.employees.employee_code,
      employee_name: schema.employees.full_name,
      skill_name: schema.skills.skill_name,
      department_id: schema.skills.department_id,
      department_name: schema.departments.name,
    })
    .from(schema.employeeSkills)
    .innerJoin(
      schema.employees,
      eq(schema.employeeSkills.emp_id, schema.employees.id),
    )
    .innerJoin(
      schema.skills,
      eq(schema.employeeSkills.skill_id, schema.skills.skill_id),
    )
    .leftJoin(
      schema.departments,
      eq(schema.skills.department_id, schema.departments.id),
    )
    .where(and(...filters))
    .limit(limit)
    .offset(offset);

  // Format response
  const approvals = skillApprovals.map((sa) => ({
    id: sa.id,
    type: "skill",
    emp_id: sa.emp_id,
    employee_code: sa.employee_code,
    employee_name: sa.employee_name,
    skill_id: sa.skill_id,
    skill_name: sa.skill_name,
    department_id: sa.department_id,
    department_name: sa.department_name,
    proficiency_level: sa.proficiency_level,
    requested_at: sa.created_at,
  }));

  return successResponse({
    approvals,
    total,
    page,
    limit,
  });
}

/**
 * Handle demand approval requests
 */
async function handleDemandApprovals(
  user: any,
  page: number,
  limit: number,
  offset: number,
) {
  // Only hr_executive can access demand approvals
  if (!checkRole(user, ["hr_executive"])) {
    // Project managers get empty array
    return successResponse({
      approvals: [],
      total: 0,
      page,
      limit,
    });
  }

  const filters = [eq(schema.resourceDemands.demand_status, "REQUESTED")];

  // Get total count
  const total = await getCount(schema.resourceDemands, and(...filters));

  // Get pending demand approvals
  const demandApprovals = await db
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
    .where(and(...filters))
    .limit(limit)
    .offset(offset);

  // Get skills for each demand
  const demandIds = demandApprovals.map((da) => da.id);
  let demandSkillsMap: Record<string, string[]> = {};

  if (demandIds.length > 0) {
    const demandSkills = await db
      .select({
        demand_id: schema.demandSkills.demand_id,
        skill_name: schema.skills.skill_name,
      })
      .from(schema.demandSkills)
      .innerJoin(
        schema.skills,
        eq(schema.demandSkills.skill_id, schema.skills.skill_id),
      )
      .where(inArray(schema.demandSkills.demand_id, demandIds));

    // Group skills by demand_id
    demandSkillsMap = demandSkills.reduce(
      (acc, ds) => {
        if (!acc[ds.demand_id]) {
          acc[ds.demand_id] = [];
        }
        acc[ds.demand_id].push(ds.skill_name);
        return acc;
      },
      {} as Record<string, string[]>,
    );
  }

  // Format response
  const approvals = demandApprovals.map((da) => ({
    id: da.id,
    type: "demand",
    project_id: da.project_id,
    project_code: da.project_code,
    project_name: da.project_name,
    role_required: da.role_required,
    skill_names: demandSkillsMap[da.id] || [],
    requested_by: da.requested_by,
    requested_by_name: da.requested_by_name,
    start_date: da.start_date,
    status: da.demand_status,
  }));

  return successResponse({
    approvals,
    total,
    page,
    limit,
  });
}
