// POST /api/tasks/generate-daily
// This endpoint should be called by a cron job daily (e.g., at 9 AM)
// Creates daily log reminder tasks for all active employees
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

    // Get all active employees
    const activeEmployees = await db
      .select({
        id: schema.employees.id,
        full_name: schema.employees.full_name,
        employee_code: schema.employees.employee_code,
      })
      .from(schema.employees)
      .where(eq(schema.employees.status, "ACTIVE"));

    let tasksCreated = 0;
    let tasksSkipped = 0;

    for (const employee of activeEmployees) {
      // Check if task already exists for today
      const [existingTask] = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.owner_id, employee.id),
            eq(schema.tasks.entity_type, "DAILY_PROJECT_LOG"),
            eq(schema.tasks.due_on, todayStr),
            eq(schema.tasks.status, "DUE"),
          ),
        );

      if (existingTask) {
        tasksSkipped++;
        continue;
      }

      // Create daily log task
      const taskDescription = `Log your daily work for ${today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`;

      await db.insert(schema.tasks).values({
        owner_id: employee.id,
        entity_type: "DAILY_PROJECT_LOG",
        entity_id: null, // No specific log yet
        description: taskDescription,
        due_on: todayStr, // Due today
        assigned_by: null, // System-generated
        status: "DUE",
      });

      tasksCreated++;
    }

    // Create audit log
    await createAuditLog({
      entity_type: "TASK",
      entity_id: "system-daily-log-generation",
      operation: "INSERT",
      changed_by: "system",
      changed_fields: {
        date: todayStr,
        tasks_created: tasksCreated,
        tasks_skipped: tasksSkipped,
        total_employees: activeEmployees.length,
      },
    });

    return successResponse({
      date: todayStr,
      tasks_created: tasksCreated,
      tasks_skipped: tasksSkipped,
      total_employees: activeEmployees.length,
      message: `Generated ${tasksCreated} daily log tasks for ${activeEmployees.length} active employees. ${tasksSkipped} tasks skipped (already exist).`,
    });
  } catch (error) {
    console.error("Error generating daily tasks:", error);
    return ErrorResponses.internalError();
  }
}
