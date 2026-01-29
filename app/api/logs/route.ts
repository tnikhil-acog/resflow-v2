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
async function handleCreate(req: NextRequest) {
  const user = await getCurrentUser(req);

  const body = await req.json();
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
    },
    201,
  );
}

// GET /api/logs/list - List logs with filters
async function handleList(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const project_id = searchParams.get("project_id");
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

  // Get logs with project and employee details
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
      project: {
        id: schema.projects.id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
      },
      employee: {
        id: schema.employees.id,
        employee_name: schema.employees.full_name,
        employee_code: schema.employees.employee_code,
      },
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
