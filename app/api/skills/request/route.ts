// POST /api/skills/request
// Allowed Roles: employee, project_manager, hr_executive
// Accept: { emp_id, skill_id, proficiency_level }
// Validation:
//   - employee/project_manager: Can request WHERE emp_id = current_user_id, else return 403
//   - hr_executive: Can request for any employee
// Check if already exists: SELECT 1 FROM employee_skills WHERE emp_id = ? AND skill_id = ?
// If exists, return 400 "Skill already requested or approved for this employee"
// INSERT INTO employee_skills (skill_id, emp_id, proficiency_level, approved_by, approved_at) VALUES (?, ?, ?, NULL, NULL)
// Return: { id, emp_id, skill_id, proficiency_level, status: 'PENDING', created_at }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const body = await req.json();
    const { skill_id, proficiency_level } = body;

    // For employees and PMs, use their own ID; HR can specify emp_id
    let emp_id = body.emp_id;

    if (checkRole(user, ["employee", "project_manager"])) {
      // Employees and PMs can only request for themselves
      emp_id = user.id;
    } else if (checkRole(user, ["hr_executive"]) && !emp_id) {
      // HR must specify emp_id
      return ErrorResponses.badRequest("emp_id is required for HR executives");
    }

    // Validate required fields
    const missingFields = validateRequiredFields(
      { skill_id, proficiency_level },
      ["skill_id", "proficiency_level"],
    );
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check if skill already requested or approved
    const [existing] = await db
      .select()
      .from(schema.employeeSkills)
      .where(
        and(
          eq(schema.employeeSkills.emp_id, emp_id),
          eq(schema.employeeSkills.skill_id, skill_id),
        ),
      );

    if (existing) {
      return ErrorResponses.badRequest(
        "Skill already requested or approved for this employee",
      );
    }

    // Insert employee skill
    const [employeeSkill] = await db
      .insert(schema.employeeSkills)
      .values({
        emp_id,
        skill_id,
        proficiency_level,
        approved_by: null,
        approved_at: null,
      })
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "EMPLOYEE_SKILL",
      entity_id: employeeSkill.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: {
        emp_id,
        skill_id,
        proficiency_level,
      },
    });

    // Get skill details and employee details for task description
    const [skillDetails] = await db
      .select({
        skill_name: schema.skills.skill_name,
      })
      .from(schema.skills)
      .where(eq(schema.skills.skill_id, skill_id));

    const [employeeDetails] = await db
      .select({
        full_name: schema.employees.full_name,
        employee_code: schema.employees.employee_code,
      })
      .from(schema.employees)
      .where(eq(schema.employees.id, emp_id));

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
    const taskDescription = `Approve skill request: ${employeeDetails?.full_name || "Employee"} (${employeeDetails?.employee_code || emp_id}) requested "${skillDetails?.skill_name || skill_id}" at ${proficiency_level} proficiency level`;

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    for (const hr of hrExecutives) {
      await db.insert(schema.tasks).values({
        owner_id: hr.id,
        entity_type: "EMPLOYEE_SKILL",
        entity_id: employeeSkill.id,
        description: taskDescription,
        due_on: dueDate.toISOString().split("T")[0], // Format as YYYY-MM-DD
        assigned_by: user.id,
        status: "DUE",
      });
    }

    return successResponse(
      {
        id: employeeSkill.id,
        emp_id: employeeSkill.emp_id,
        skill_id: employeeSkill.skill_id,
        proficiency_level: employeeSkill.proficiency_level,
        status: "PENDING",
        created_at: employeeSkill.created_at,
        message: `Skill request submitted. ${hrExecutives.length} approval task(s) created for HR.`,
      },
      201,
    );
  } catch (error) {
    console.error("Error requesting skill:", error);
    return ErrorResponses.internalError();
  }
}
