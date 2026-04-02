// POST /api/tasks/generate-weekly
// This endpoint should be called by a cron job weekly (e.g., Monday at 9 AM)
// Creates weekly report reminder tasks for all active employees
// Allowed: Internal calls only (can add API key validation)

import { NextRequest } from "next/server";
import { db, schema } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    // Optional: Add API key validation for security
    const authHeader = req.headers.get("authorization");
    const apiKey = process.env.CRON_API_KEY;

    if (apiKey && authHeader !== `Bearer ${apiKey}`) {
      return ErrorResponses.accessDenied();
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    // Calculate end of week (Friday)
    const endOfWeek = new Date(today);
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilFriday = dayOfWeek <= 5 ? 5 - dayOfWeek : 7 - dayOfWeek + 5;
    endOfWeek.setDate(today.getDate() + daysUntilFriday);
    const endOfWeekStr = endOfWeek.toISOString().split("T")[0];

    // Calculate start of week (Monday)
    const startOfWeek = new Date(today);
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Sunday
    startOfWeek.setDate(today.getDate() - daysFromMonday);
    const startOfWeekStr = startOfWeek.toISOString().split("T")[0];

    // Get all active employees
    const activeEmployees = await db
      .select({
        emp_id: schema.employees.id,
        full_name: schema.employees.full_name,
        employee_code: schema.employees.employee_code,
      })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));

    let tasksCreated = 0;
    let tasksSkipped = 0;

    for (const employee of activeEmployees) {
      // Check if task already exists for this week
      const [existingTask] = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.owner_id, employee.emp_id),
            eq(schema.tasks.entity_type, "REPORT"),
            eq(schema.tasks.due_on, endOfWeekStr),
            eq(schema.tasks.status, "DUE"),
          ),
        );

      if (existingTask) {
        tasksSkipped++;
        continue;
      }

      // Create weekly report task
      const taskDescription = `Submit weekly report for week of ${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

      await db.insert(schema.tasks).values({
        owner_id: employee.emp_id,
        entity_type: "REPORT",
        entity_id: null, // No specific report yet
        description: taskDescription,
        due_on: endOfWeekStr, // Due end of week (Friday)
        assigned_by: null, // System-generated
        status: "DUE",
      });

      tasksCreated++;
    }

    // Create audit log
    await createAuditLog({
      entity_type: "TASK",
      entity_id: "system-weekly-report-generation",
      operation: "INSERT",
      changed_by: "system",
      changed_fields: {
        week_start: startOfWeekStr,
        week_end: endOfWeekStr,
        tasks_created: tasksCreated,
        tasks_skipped: tasksSkipped,
        total_employees: activeEmployees.length,
      },
    });

    return successResponse({
      week_start: startOfWeekStr,
      week_end: endOfWeekStr,
      tasks_created: tasksCreated,
      tasks_skipped: tasksSkipped,
      total_employees: activeEmployees.length,
      message: `Generated ${tasksCreated} weekly report tasks for ${activeEmployees.length} active employees. ${tasksSkipped} tasks skipped (already exist).`,
    });
  } catch (error) {
    console.error("Error generating weekly tasks:", error);
    return ErrorResponses.internalError();
  }
}
