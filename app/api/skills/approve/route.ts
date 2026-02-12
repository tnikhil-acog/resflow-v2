// POST /api/skills/approve
// Allowed Roles: project_manager, hr_executive
// Accept: { employee_skill_id, action: "approve" | "reject" }
// Get employee_skill: SELECT emp_id, approved_by, approved_at FROM employee_skills WHERE id = employee_skill_id
// Validation:
//   - Status must be PENDING (approved_by IS NULL AND approved_at IS NULL), else return 400 "Skill already processed"
//   - project_manager: Can approve WHERE emp_id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403 "Cannot approve skills for non-team members"
//   - hr_executive: Can approve for any employee
// If action = "approve":
//   - UPDATE employee_skills SET approved_by = current_user_id, approved_at = CURRENT_DATE WHERE id = employee_skill_id
//   - INSERT audit log with operation='UPDATE', changed_by=current_user_id
//   - Return: { id, emp_id, skill_id, proficiency_level, approved_by, approved_at, status: 'APPROVED' }
// If action = "reject":
//   - DELETE FROM employee_skills WHERE id = employee_skill_id
//   - INSERT audit log with operation='DELETE', changed_by=current_user_id
//   - Return: { message: "Skill request rejected" }
// Error 403 if access denied

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { isInPMTeam } from "@/lib/db-helpers";
import { toDateString } from "@/lib/date-utils";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { employee_skill_id, action, task_id } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "employee_skill_id",
      "action",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Validate action
    if (action !== "approve" && action !== "reject") {
      return ErrorResponses.badRequest(
        "action must be either 'approve' or 'reject'",
      );
    }

    // Get employee skill
    const [employeeSkill] = await db
      .select()
      .from(schema.employeeSkills)
      .where(eq(schema.employeeSkills.id, employee_skill_id));

    if (!employeeSkill) {
      return ErrorResponses.notFound("Employee skill");
    }

    // Check if already processed
    if (employeeSkill.approved_by || employeeSkill.approved_at) {
      return ErrorResponses.badRequest("Skill already processed");
    }

    // Project manager validation
    if (checkRole(user, ["project_manager"])) {
      const isTeamMember = await isInPMTeam(employeeSkill.emp_id, user.id);
      if (!isTeamMember) {
        return ErrorResponses.badRequest(
          "Cannot approve skills for non-team members",
        );
      }
    }

    if (action === "approve") {
      // Approve the skill
      const [updated] = await db
        .update(schema.employeeSkills)
        .set({
          approved_by: user.id,
          approved_at: toDateString(new Date()),
        })
        .where(eq(schema.employeeSkills.id, employee_skill_id))
        .returning();

      // Create audit log
      await createAuditLog({
        entity_type: "EMPLOYEE_SKILL",
        entity_id: employee_skill_id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: {
          approved_by: user.id,
          approved_at: updated.approved_at,
        },
      });

      // Complete the skill approval task(s) for this employee skill
      let completedTasksCount = 0;

      if (task_id) {
        // If task_id is provided, complete only that specific task
        const [specificTask] = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.id, task_id),
              eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
              eq(schema.tasks.entity_id, employee_skill_id),
              eq(schema.tasks.status, "DUE"),
            ),
          );

        if (specificTask) {
          await db
            .update(schema.tasks)
            .set({ status: "COMPLETED" })
            .where(eq(schema.tasks.id, task_id));

          await createAuditLog({
            entity_type: "TASK",
            entity_id: task_id,
            operation: "UPDATE",
            changed_by: user.id,
            changed_fields: {
              status: "COMPLETED",
              completion_reason: "Skill request approved",
            },
          });
          completedTasksCount = 1;
        }
      } else {
        // Otherwise, complete all matching tasks (backward compatibility)
        const skillApprovalTasks = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
              eq(schema.tasks.entity_id, employee_skill_id),
              eq(schema.tasks.status, "DUE"),
            ),
          );

        if (skillApprovalTasks.length > 0) {
          await db
            .update(schema.tasks)
            .set({ status: "COMPLETED" })
            .where(
              and(
                eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
                eq(schema.tasks.entity_id, employee_skill_id),
                eq(schema.tasks.status, "DUE"),
              ),
            );

          // Create audit logs for task completions
          for (const task of skillApprovalTasks) {
            await createAuditLog({
              entity_type: "TASK",
              entity_id: task.id,
              operation: "UPDATE",
              changed_by: user.id,
              changed_fields: {
                status: "COMPLETED",
                completion_reason: "Skill request approved",
              },
            });
            completedTasksCount++;
          }
        }
      }

      return successResponse({
        id: updated.id,
        emp_id: updated.emp_id,
        skill_id: updated.skill_id,
        proficiency_level: updated.proficiency_level,
        approved_by: updated.approved_by,
        approved_at: updated.approved_at,
        status: "APPROVED",
        approval_tasks_completed: completedTasksCount,
        message:
          completedTasksCount > 0
            ? `Skill approved. ${completedTasksCount} approval task(s) completed.`
            : "Skill approved.",
      });
    } else {
      // Reject the skill
      await db
        .delete(schema.employeeSkills)
        .where(eq(schema.employeeSkills.id, employee_skill_id));

      // Create audit log
      await createAuditLog({
        entity_type: "EMPLOYEE_SKILL",
        entity_id: employee_skill_id,
        operation: "DELETE",
        changed_by: user.id,
        changed_fields: {},
      });

      // Complete the skill approval task(s) for this employee skill (rejection)
      let completedTasksCount = 0;

      if (task_id) {
        // If task_id is provided, complete only that specific task
        const [specificTask] = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.id, task_id),
              eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
              eq(schema.tasks.entity_id, employee_skill_id),
              eq(schema.tasks.status, "DUE"),
            ),
          );

        if (specificTask) {
          await db
            .update(schema.tasks)
            .set({ status: "COMPLETED" })
            .where(eq(schema.tasks.id, task_id));

          await createAuditLog({
            entity_type: "TASK",
            entity_id: task_id,
            operation: "UPDATE",
            changed_by: user.id,
            changed_fields: {
              status: "COMPLETED",
              completion_reason: "Skill request rejected",
            },
          });
          completedTasksCount = 1;
        }
      } else {
        // Otherwise, complete all matching tasks (backward compatibility)
        const skillApprovalTasks = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
              eq(schema.tasks.entity_id, employee_skill_id),
              eq(schema.tasks.status, "DUE"),
            ),
          );

        if (skillApprovalTasks.length > 0) {
          await db
            .update(schema.tasks)
            .set({ status: "COMPLETED" })
            .where(
              and(
                eq(schema.tasks.entity_type, "EMPLOYEE_SKILL"),
                eq(schema.tasks.entity_id, employee_skill_id),
                eq(schema.tasks.status, "DUE"),
              ),
            );

          // Create audit logs for task completions
          for (const task of skillApprovalTasks) {
            await createAuditLog({
              entity_type: "TASK",
              entity_id: task.id,
              operation: "UPDATE",
              changed_by: user.id,
              changed_fields: {
                status: "COMPLETED",
                completion_reason: "Skill request rejected",
              },
            });
            completedTasksCount++;
          }
        }
      }

      return successResponse({
        message: "Skill request rejected",
        approval_tasks_completed: completedTasksCount,
      });
    }
  } catch (error) {
    console.error("Error approving/rejecting skill:", error);
    return ErrorResponses.internalError();
  }
}
