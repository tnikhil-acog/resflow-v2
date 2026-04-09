// GET /api/employee-skills/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: emp_id, status, page, limit
// status parameter values:
//   - PENDING: WHERE approved_by IS NULL AND approved_at IS NULL
//   - APPROVED: WHERE approved_by IS NOT NULL AND approved_at IS NOT NULL
// Data Filtering:
//   - employee: Returns WHERE emp_id = current_user_id
//   - project_manager: Returns WHERE emp_id IN team OR emp_id = current_user_id
//   - hr_executive: Returns all employee skills
// SELECT * FROM employee_skills WHERE filters applied
// JOIN skills table to get skill_name, skill_department
// JOIN employees table to get employee_code, employee_name (full_name)
// JOIN employees table (for approved_by) to get approved_by_name
// Compute status: IF approved_by IS NULL AND approved_at IS NULL THEN 'PENDING' ELSE 'APPROVED'
// Apply pagination using LIMIT and OFFSET
// Return: { employee_skills: [{ skill_id, skill_name, emp_id, employee_code, employee_name, proficiency_level, approved_by, approved_by_name, approved_at, status }], total, page, limit }
// Error 403 if access denied

// PUT /api/employee-skills
// Allowed Roles: hr_executive
// Accept: { action: "approve" | "reject", id: employee_skill_id }
// Validation:
//   - Only hr_executive can approve/reject
//   - Check if skill request exists
//   - Check if already processed (approved_by/approved_at not null)
// If action = "approve":
//   - UPDATE employee_skills SET approved_by = current_user_id, approved_at = NOW() WHERE id = ?
//   - INSERT audit log with operation='UPDATE'
// If action = "reject":
//   - DELETE FROM employee_skills WHERE id = ?
//   - INSERT audit log with operation='DELETE'
// Return: { message: "Skill request [approved|rejected] successfully" }
// Error 403 if not HR, 404 if not found, 400 if already processed

// DELETE /api/employee-skills/delete
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { emp_id, skill_id }
// Get employee_skill: SELECT approved_by, approved_at FROM employee_skills WHERE emp_id = ? AND skill_id = ?
// Validation:
//   - employee: Can delete WHERE emp_id = current_user_id AND approved_by IS NULL, else return 403 "Cannot delete approved skills or skills for other employees"
//   - project_manager: Can delete WHERE emp_id = current_user_id AND approved_by IS NULL, else return 403 "Cannot delete approved skills or skills for other employees"
//   - hr_executive: Can delete any employee skill
// DELETE FROM employee_skills WHERE emp_id = ? AND skill_id = ?
// INSERT audit log with operation='DELETE', entity_type='EMPLOYEE_SKILL', changed_by=current_user_id
// Return: { message: "Employee skill deleted successfully" }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getCount, isInPMTeam } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  getPaginationParams,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, or, isNull, isNotNull, inArray, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const { page, limit, offset } = getPaginationParams(new URL(req.url));

    const emp_id = searchParams.get("emp_id");
    const status = searchParams.get("status");

    // Build filters
    const filters: any[] = [];

    // Role-based data filtering
    if (checkRole(user, ["employee"])) {
      // Employee can only see their own skills
      filters.push(eq(schema.employeeSkills.emp_id, user.id));
    } else if (checkRole(user, ["project_manager"])) {
      // Project manager can see their team's skills or their own
      // Get team member IDs
      const teamMembers = await db
        .select({ emp_id: schema.projectAllocation.emp_id })
        .from(schema.projectAllocation)
        .innerJoin(
          schema.projects,
          eq(schema.projectAllocation.project_id, schema.projects.id),
        )
        .where(eq(schema.projects.project_manager_id, user.id));

      const teamEmpIds = [
        ...new Set(teamMembers.map((m) => m.emp_id)),
        user.id,
      ];

      if (emp_id) {
        // Check if requested emp_id is in team
        if (!teamEmpIds.includes(emp_id)) {
          return ErrorResponses.accessDenied();
        }
        filters.push(eq(schema.employeeSkills.emp_id, emp_id));
      } else {
        filters.push(inArray(schema.employeeSkills.emp_id, teamEmpIds));
      }
    } else if (checkRole(user, ["hr_executive"])) {
      // HR can see all employee skills
      if (emp_id) {
        filters.push(eq(schema.employeeSkills.emp_id, emp_id));
      }
    } else {
      return ErrorResponses.accessDenied();
    }

    // Status filter
    if (status === "PENDING") {
      filters.push(isNull(schema.employeeSkills.approved_by));
      filters.push(isNull(schema.employeeSkills.approved_at));
    } else if (status === "APPROVED") {
      filters.push(isNotNull(schema.employeeSkills.approved_by));
      filters.push(isNotNull(schema.employeeSkills.approved_at));
    }

    // Get total count
    const total = await getCount(
      schema.employeeSkills,
      filters.length > 0 ? and(...filters) : undefined,
    );

    // Get employee skills with joins
    const employeeSkillsData = await db
      .select({
        id: schema.employeeSkills.id,
        skill_id: schema.employeeSkills.skill_id,
        emp_id: schema.employeeSkills.emp_id,
        proficiency_level: schema.employeeSkills.proficiency_level,
        approved_by: schema.employeeSkills.approved_by,
        approved_at: schema.employeeSkills.approved_at,
        skill_name: schema.skills.skill_name,
        department_id: schema.skills.department_id,
        department_name: schema.departments.name,
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
      })
      .from(schema.employeeSkills)
      .innerJoin(
        schema.skills,
        eq(schema.employeeSkills.skill_id, schema.skills.skill_id),
      )
      .leftJoin(
        schema.departments,
        eq(schema.skills.department_id, schema.departments.id),
      )
      .innerJoin(
        schema.employees,
        eq(schema.employeeSkills.emp_id, schema.employees.id),
      )
      .where(filters.length > 0 ? and(...filters) : undefined)
      .limit(limit)
      .offset(offset);

    // Get approved_by names
    const approvedByIds = employeeSkillsData
      .map((es) => es.approved_by)
      .filter((id): id is string => id !== null);

    let approvedByMap: Record<string, string> = {};
    if (approvedByIds.length > 0) {
      const approvers = await db
        .select({
          id: schema.employees.id,
          full_name: schema.employees.full_name,
        })
        .from(schema.employees)
        .where(inArray(schema.employees.id, approvedByIds));

      approvedByMap = Object.fromEntries(
        approvers.map((a) => [a.id, a.full_name]),
      );
    }

    // Format response with status
    const employee_skills = employeeSkillsData.map((es) => ({
      id: es.id,
      skill_id: es.skill_id,
      skill_name: es.skill_name,
      emp_id: es.emp_id,
      employee_code: es.employee_code,
      employee_name: es.employee_name,
      proficiency_level: es.proficiency_level,
      approved_by: es.approved_by,
      approved_by_name: es.approved_by ? approvedByMap[es.approved_by] : null,
      approved_at: es.approved_at,
      status: es.approved_by && es.approved_at ? "APPROVED" : "PENDING",
    }));

    return successResponse({
      employee_skills,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error listing employee skills:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();
    const { action, id } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["action", "id"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Only HR executives can approve/reject skills
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Validate action
    if (action !== "approve" && action !== "reject") {
      return ErrorResponses.badRequest(
        "Invalid action. Must be 'approve' or 'reject'",
      );
    }

    // Get employee skill
    const [employeeSkill] = await db
      .select()
      .from(schema.employeeSkills)
      .where(eq(schema.employeeSkills.id, id));

    if (!employeeSkill) {
      return ErrorResponses.notFound("Employee skill request");
    }

    // Check if already processed
    if (employeeSkill.approved_by || employeeSkill.approved_at) {
      return ErrorResponses.badRequest("Skill request already processed");
    }

    if (action === "approve") {
      // Approve the skill
      const now = new Date().toISOString();
      await db
        .update(schema.employeeSkills)
        .set({
          approved_by: user.id,
          approved_at: now,
        })
        .where(eq(schema.employeeSkills.id, id));

      // Create audit log
      await createAuditLog({
        entity_type: "EMPLOYEE_SKILL",
        entity_id: id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: {
          approved_by: user.id,
          approved_at: now,
        },
      });

      return successResponse({
        message: "Skill request approved successfully",
      });
    } else {
      // Reject means delete the pending request
      await db
        .delete(schema.employeeSkills)
        .where(eq(schema.employeeSkills.id, id));

      // Create audit log
      await createAuditLog({
        entity_type: "EMPLOYEE_SKILL",
        entity_id: id,
        operation: "DELETE",
        changed_by: user.id,
        changed_fields: {
          action: "rejected",
          emp_id: employeeSkill.emp_id,
          skill_id: employeeSkill.skill_id,
        },
      });

      return successResponse({
        message: "Skill request rejected successfully",
      });
    }
  } catch (error) {
    console.error("Error processing skill request:", error);
    return ErrorResponses.internalError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const body = await req.json();
    const { emp_id, skill_id } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["emp_id", "skill_id"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get employee skill
    const [employeeSkill] = await db
      .select()
      .from(schema.employeeSkills)
      .where(
        and(
          eq(schema.employeeSkills.emp_id, emp_id),
          eq(schema.employeeSkills.skill_id, skill_id),
        ),
      );

    if (!employeeSkill) {
      return ErrorResponses.notFound("Employee skill");
    }

    // Role-based validation
    if (checkRole(user, ["employee", "project_manager"])) {
      // Can only delete own skills and only if not approved
      if (emp_id !== user.id) {
        return ErrorResponses.badRequest(
          "Cannot delete skills for other employees",
        );
      }
      if (employeeSkill.approved_by || employeeSkill.approved_at) {
        return ErrorResponses.badRequest("Cannot delete approved skills");
      }
    } else if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }
    // hr_executive can delete any employee skill (no additional validation)

    // Delete employee skill
    await db
      .delete(schema.employeeSkills)
      .where(
        and(
          eq(schema.employeeSkills.emp_id, emp_id),
          eq(schema.employeeSkills.skill_id, skill_id),
        ),
      );

    // Create audit log
    await createAuditLog({
      entity_type: "EMPLOYEE_SKILL",
      entity_id: `${emp_id}:${skill_id}`,
      operation: "DELETE",
      changed_by: user.id,
      changed_fields: {
        emp_id,
        skill_id,
        proficiency_level: employeeSkill.proficiency_level,
      },
    });

    return successResponse({
      message: "Employee skill deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting employee skill:", error);
    return ErrorResponses.internalError();
  }
}
