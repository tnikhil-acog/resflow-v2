// GET /api/skills/employee
// Allowed Roles: employee, project_manager, hr_executive
// Query param: emp_id (required)
// Data Filtering:
//   - employee: Can view WHERE emp_id = current_user_id, else return 403
//   - project_manager: Can view WHERE emp_id = current_user_id OR emp_id IN team, else return 403
//   - hr_executive: Can view any employee's skills
// SELECT * FROM employee_skills WHERE emp_id = ?
// JOIN skills table to get skill_name, skill_department
// Compute status: IF approved_by IS NULL AND approved_at IS NULL THEN 'PENDING' ELSE 'APPROVED'
// Return: { employee_skills: [{ id, emp_id, skill_id, skill_name, skill_department, proficiency_level, approved_by, approved_at, status }] }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { isInPMTeam } from "@/lib/db-helpers";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const { searchParams } = new URL(req.url);
    const emp_id = searchParams.get("emp_id");

    // emp_id is required
    if (!emp_id) {
      return ErrorResponses.badRequest("emp_id is required");
    }

    // Check access based on role
    if (checkRole(user, ["employee"])) {
      // Employee can only view their own skills
      if (emp_id !== user.id) {
        return ErrorResponses.accessDenied();
      }
    } else if (checkRole(user, ["project_manager"])) {
      // PM can view own skills or team member skills
      if (emp_id !== user.id) {
        const isTeamMember = await isInPMTeam(emp_id, user.id);
        if (!isTeamMember) {
          return ErrorResponses.accessDenied();
        }
      }
    }
    // hr_executive can view any employee's skills

    // Get employee skills with skill details and department
    const employeeSkills = await db
      .select({
        id: schema.employeeSkills.id,
        emp_id: schema.employeeSkills.emp_id,
        skill_id: schema.employeeSkills.skill_id,
        skill_name: schema.skills.skill_name,
        department_id: schema.skills.department_id,
        department_name: schema.departments.name,
        proficiency_level: schema.employeeSkills.proficiency_level,
        approved_by: schema.employeeSkills.approved_by,
        approved_at: schema.employeeSkills.approved_at,
        created_at: schema.employeeSkills.created_at,
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
      .where(eq(schema.employeeSkills.emp_id, emp_id));

    // Compute status for each skill
    const skillsWithStatus = employeeSkills.map((skill) => ({
      ...skill,
      status: !skill.approved_by && !skill.approved_at ? "PENDING" : "APPROVED",
    }));

    return successResponse({ employee_skills: skillsWithStatus });
  } catch (error) {
    console.error("Error fetching employee skills:", error);
    return ErrorResponses.internalError();
  }
}
