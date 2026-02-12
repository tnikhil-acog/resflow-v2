import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { isProjectManager, getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, gte, lte, inArray, sql } from "drizzle-orm";

// POST /api/logs/create - Create daily project log
// Supports both single log: { project_id, log_date, hours, notes }
// And bulk logs: { logs: [{ project_id, log_date, hours, notes }, ...] }
async function handleCreate(req: NextRequest) {
  const user = await getCurrentUser(req);

  const body = await req.json();

  // Check if this is a bulk submission or single
  if (body.logs && Array.isArray(body.logs)) {
    // Bulk submission
    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ index: number; project_id: string; error: string }>,
    };

    for (let index = 0; index < body.logs.length; index++) {
      const logData = body.logs[index];
      const { project_id, log_date, hours, notes } = logData;

      try {
        // Validate required fields
        const missingFields = validateRequiredFields(logData, [
          "project_id",
          "log_date",
          "hours",
        ]);
        if (missingFields) {
          throw new Error(missingFields);
        }

        // Validate hours
        const hoursNum = parseFloat(hours);
        if (isNaN(hoursNum) || hoursNum <= 0) {
          throw new Error("hours must be a positive number");
        }

        // Check if project exists
        const [project] = await db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.id, project_id));

        if (!project) {
          throw new Error("Project not found");
        }

        // Check if log already exists
        const [existingLog] = await db
          .select()
          .from(schema.dailyProjectLogs)
          .where(
            and(
              eq(schema.dailyProjectLogs.emp_id, user.id),
              eq(schema.dailyProjectLogs.project_id, project_id),
              eq(schema.dailyProjectLogs.log_date, log_date),
            ),
          );

        if (existingLog) {
          if (existingLog.locked) {
            throw new Error(
              "Cannot modify locked logs. Already submitted in weekly report",
            );
          }
          throw new Error("Log already exists for this date");
        }

        // Insert log
        const [log] = await db
          .insert(schema.dailyProjectLogs)
          .values({
            emp_id: user.id,
            project_id,
            log_date,
            hours: hours.toString(),
            notes: notes || null,
            locked: false,
          })
          .returning();

        // Create audit log
        await createAuditLog({
          entity_type: "DAILY_PROJECT_LOG",
          entity_id: log.id,
          operation: "INSERT",
          changed_by: user.id,
          changed_fields: {
            project_id,
            log_date,
            hours,
            notes,
          },
        });

        // Complete daily log task for this date if it exists
        const dailyLogTasks = await db
          .select()
          .from(schema.tasks)
          .where(
            and(
              eq(schema.tasks.owner_id, user.id),
              eq(schema.tasks.entity_type, "DAILY_PROJECT_LOG"),
              sql`DATE(${schema.tasks.due_on}) = ${log_date}`,
              eq(schema.tasks.status, "DUE"),
            ),
          );

        if (dailyLogTasks.length > 0) {
          await db
            .update(schema.tasks)
            .set({ status: "COMPLETED" })
            .where(
              and(
                eq(schema.tasks.owner_id, user.id),
                eq(schema.tasks.entity_type, "DAILY_PROJECT_LOG"),
                sql`DATE(${schema.tasks.due_on}) = ${log_date}`,
              ),
            );
        }

        results.successful++;
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          index,
          project_id,
          error: error.message,
        });
      }
    }

    return successResponse({
      message: `${results.successful} log(s) created successfully${results.failed > 0 ? `, ${results.failed} failed` : ""}`,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors,
    });
  }

  // Single submission (original logic)
  const { project_id, log_date, hours, notes } = body;

  // Validate required fields
  const missingFields = validateRequiredFields(body, [
    "project_id",
    "log_date",
    "hours",
  ]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Validate hours
  const hoursNum = parseFloat(hours);
  if (isNaN(hoursNum) || hoursNum <= 0) {
    return ErrorResponses.badRequest("hours must be a positive number");
  }

  // Check if project exists
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, project_id));

  if (!project) {
    return ErrorResponses.notFound("Project");
  }

  // Check if log already exists
  const [existingLog] = await db
    .select()
    .from(schema.dailyProjectLogs)
    .where(
      and(
        eq(schema.dailyProjectLogs.emp_id, user.id),
        eq(schema.dailyProjectLogs.project_id, project_id),
        eq(schema.dailyProjectLogs.log_date, log_date),
      ),
    );

  if (existingLog) {
    if (existingLog.locked) {
      return ErrorResponses.badRequest(
        "Cannot modify locked logs. Already submitted in weekly report",
      );
    }
    return ErrorResponses.badRequest(
      "Log already exists for this date. Use update endpoint instead.",
    );
  }

  // Insert log
  const [log] = await db
    .insert(schema.dailyProjectLogs)
    .values({
      emp_id: user.id,
      project_id,
      log_date,
      hours: hours.toString(),
      notes: notes || null,
      locked: false,
    })
    .returning();

  // Create audit log
  await createAuditLog({
    entity_type: "DAILY_PROJECT_LOG",
    entity_id: log.id,
    operation: "INSERT",
    changed_by: user.id,
    changed_fields: {
      project_id,
      log_date,
      hours,
      notes,
    },
  });

  // Complete daily log task for this date if it exists
  const dailyLogTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.owner_id, user.id),
        eq(schema.tasks.entity_type, "DAILY_PROJECT_LOG"),
        eq(schema.tasks.due_on, log_date),
        eq(schema.tasks.status, "DUE"),
      ),
    );

  let completedTasksCount = 0;

  if (dailyLogTasks.length > 0) {
    // Mark the daily log task as completed
    await db
      .update(schema.tasks)
      .set({ status: "COMPLETED" })
      .where(
        and(
          eq(schema.tasks.owner_id, user.id),
          eq(schema.tasks.entity_type, "DAILY_PROJECT_LOG"),
          eq(schema.tasks.due_on, log_date),
          eq(schema.tasks.status, "DUE"),
        ),
      );

    // Create audit log for task completion
    for (const task of dailyLogTasks) {
      await createAuditLog({
        entity_type: "TASK",
        entity_id: task.id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: {
          status: "COMPLETED",
          completion_reason: "Daily log created",
          log_id: log.id,
        },
      });
      completedTasksCount++;
    }
  }

  return successResponse(
    {
      id: log.id,
      emp_id: log.emp_id,
      project_id: log.project_id,
      log_date: log.log_date,
      hours: log.hours,
      notes: log.notes,
      locked: log.locked,
      created_at: log.created_at,
      daily_log_tasks_completed: completedTasksCount,
      message:
        completedTasksCount > 0
          ? `Log created. ${completedTasksCount} daily log task(s) completed.`
          : "Log created successfully.",
    },
    201,
  );
}

// GET /api/logs/list - List logs with filters
async function handleList(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get("project_id");
  const emp_id = searchParams.get("emp_id");
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");
  const locked = searchParams.get("locked");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Build where clause based on role
  let whereConditions: any[] = [];

  if (checkRole(user, ["employee"])) {
    // Employee can only see their own logs
    whereConditions.push(eq(schema.dailyProjectLogs.emp_id, user.id));
  } else if (checkRole(user, ["project_manager"])) {
    // PM can see logs for their projects
    const pmProjects = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.project_manager_id, user.id));

    const projectIds = pmProjects.map((p) => p.id);
    if (projectIds.length > 0) {
      whereConditions.push(
        inArray(schema.dailyProjectLogs.project_id, projectIds),
      );
    } else {
      // PM has no projects, return empty
      return successResponse({ logs: [], total: 0, page, limit });
    }
  }
  // hr_executive can see all logs

  // Apply filters
  // For HR/PM: allow filtering by emp_id
  if (emp_id && checkRole(user, ["hr_executive", "project_manager"])) {
    whereConditions.push(eq(schema.dailyProjectLogs.emp_id, emp_id));
  }

  if (project_id) {
    whereConditions.push(eq(schema.dailyProjectLogs.project_id, project_id));
  }
  if (start_date) {
    whereConditions.push(gte(schema.dailyProjectLogs.log_date, start_date));
  }
  if (end_date) {
    whereConditions.push(lte(schema.dailyProjectLogs.log_date, end_date));
  }
  if (locked !== null) {
    whereConditions.push(eq(schema.dailyProjectLogs.locked, locked === "true"));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count
  const total = await getCount(schema.dailyProjectLogs, whereClause);

  // Get logs with project, employee details, and billability
  const baseQuery = db
    .select({
      id: schema.dailyProjectLogs.id,
      emp_id: schema.dailyProjectLogs.emp_id,
      project_id: schema.dailyProjectLogs.project_id,
      log_date: schema.dailyProjectLogs.log_date,
      hours: schema.dailyProjectLogs.hours,
      notes: schema.dailyProjectLogs.notes,
      locked: schema.dailyProjectLogs.locked,
      created_at: schema.dailyProjectLogs.created_at,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      employee_name: schema.employees.full_name,
      employee_code: schema.employees.employee_code,
      billability: schema.projectAllocation.billability,
    })
    .from(schema.dailyProjectLogs)
    .innerJoin(
      schema.projects,
      eq(schema.dailyProjectLogs.project_id, schema.projects.id),
    )
    .innerJoin(
      schema.employees,
      eq(schema.dailyProjectLogs.emp_id, schema.employees.id),
    )
    .leftJoin(
      schema.projectAllocation,
      and(
        eq(
          schema.dailyProjectLogs.project_id,
          schema.projectAllocation.project_id,
        ),
        eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
      ),
    )
    .limit(limit)
    .offset(offset);

  const logs = whereClause
    ? await baseQuery.where(whereClause)
    : await baseQuery;

  return successResponse({ logs, total, page, limit });
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreate(req);
  } catch (error) {
    console.error("Error creating log:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handleList(req);
  } catch (error) {
    console.error("Error fetching logs:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const body = await req.json();
    const { id, hours, notes } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get log
    const [log] = await db
      .select()
      .from(schema.dailyProjectLogs)
      .where(eq(schema.dailyProjectLogs.id, id));

    if (!log) {
      return ErrorResponses.notFound("Log");
    }

    // Check ownership
    if (log.emp_id !== user.id) {
      return ErrorResponses.accessDenied();
    }

    // Check if locked
    if (log.locked) {
      return ErrorResponses.badRequest("Cannot modify locked logs");
    }

    // Validate hours if provided
    if (hours !== undefined) {
      const hoursNum = parseFloat(hours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        return ErrorResponses.badRequest("hours must be a positive number");
      }
    }

    // Update log
    const updateData: any = {};
    if (hours !== undefined) updateData.hours = hours.toString();
    if (notes !== undefined) updateData.notes = notes;

    const [updated] = await db
      .update(schema.dailyProjectLogs)
      .set(updateData)
      .where(eq(schema.dailyProjectLogs.id, id))
      .returning();

    // Create audit log
    await createAuditLog({
      entity_type: "DAILY_PROJECT_LOG",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: updateData,
    });

    return successResponse({
      id: updated.id,
      hours: updated.hours,
      notes: updated.notes,
    });
  } catch (error) {
    console.error("Error updating log:", error);
    return ErrorResponses.internalError();
  }
}
