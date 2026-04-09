import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getPMTeamMemberIds, isInPMTeam, getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, inArray, or } from "drizzle-orm";

/**
 * Tasks API Routes
 *
 * POST /api/tasks - Create new task
 * GET /api/tasks?id={id} - Get single task by ID
 * GET /api/tasks - List tasks with filters
 *
 * Allowed Roles:
 * - POST: project_manager, hr_executive
 * - GET single: employee (own), project_manager (team), hr_executive (all)
 * - GET list: employee (own), project_manager (team), hr_executive (all)
 */

// POST /api/tasks - Create new task
async function handleCreate(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!checkRole(user, ["project_manager", "hr_executive"])) {
    return ErrorResponses.accessDenied();
  }

  const body = await req.json();
  const { owner_id, entity_type, entity_id, description, due_on } = body;

  // Validate required fields (entity_type and entity_id are now optional)
  const missingFields = validateRequiredFields(body, [
    "owner_id",
    "description",
    "due_on",
  ]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Project manager validation
  if (checkRole(user, ["project_manager"])) {
    const isTeamMember = await isInPMTeam(owner_id, user.id);
    if (!isTeamMember) {
      return ErrorResponses.badRequest(
        "Cannot assign tasks to non-team members",
      );
    }
  }

  // Insert task
  const [task] = await db
    .insert(schema.tasks)
    .values({
      owner_id,
      entity_type,
      entity_id,
      description,
      due_on,
      assigned_by: user.id,
      status: "DUE",
    })
    .returning();

  // Create audit log
  await createAuditLog({
    entity_type: "TASK",
    entity_id: task.id,
    operation: "INSERT",
    changed_by: user.id,
    changed_fields: {
      owner_id,
      entity_type,
      entity_id,
      description,
      due_on,
    },
  });

  return successResponse(
    {
      id: task.id,
      owner_id: task.owner_id,
      entity_type: task.entity_type,
      entity_id: task.entity_id,
      description: task.description,
      status: task.status,
      due_on: task.due_on,
      assigned_by: task.assigned_by,
      created_at: task.created_at,
    },
    201,
  );
}

// GET /api/tasks/list - List tasks with filters and pagination
async function handleList(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const owner_id = searchParams.get("owner_id");
  const entity_type = searchParams.get("entity_type");
  const status = searchParams.get("status");
  const view = searchParams.get("view"); // my_tasks | assigned_by_me
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Build where clause based on view parameter
  let whereConditions: any[] = [];

  if (view === "my_tasks") {
    // Show only tasks where current user is the owner
    whereConditions.push(eq(schema.tasks.owner_id, user.id));
  } else if (view === "assigned_by_me") {
    // Show only tasks assigned by current user (PM/HR only)
    if (
      !checkRole(user, ["project_manager", "hr_executive"]) ||
      user.id === null
    ) {
      return ErrorResponses.accessDenied();
    }
    whereConditions.push(eq(schema.tasks.assigned_by, user.id));
  } else {
    // Default behavior (backward compatible)
    if (checkRole(user, ["employee"])) {
      // Employee can only see their own tasks
      whereConditions.push(eq(schema.tasks.owner_id, user.id));
    } else if (checkRole(user, ["project_manager"])) {
      // PM can see team tasks or tasks they assigned
      const teamMemberIds = await getPMTeamMemberIds(user.id);
      whereConditions.push(
        or(
          inArray(schema.tasks.owner_id, teamMemberIds),
          eq(schema.tasks.assigned_by, user.id),
        ),
      );
    }
    // hr_executive can see all tasks
  }

  // Apply filters
  if (owner_id) {
    whereConditions.push(eq(schema.tasks.owner_id, owner_id));
  }
  if (entity_type) {
    whereConditions.push(eq(schema.tasks.entity_type, entity_type as any));
  }
  if (status) {
    whereConditions.push(
      eq(schema.tasks.status, status as "DUE" | "COMPLETED"),
    );
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count
  const total = await getCount(schema.tasks, whereClause);

  // Get tasks with owner details
  const baseQuery = db
    .select({
      id: schema.tasks.id,
      owner_id: schema.tasks.owner_id,
      owner_name: schema.employees.full_name,
      entity_type: schema.tasks.entity_type,
      entity_id: schema.tasks.entity_id,
      description: schema.tasks.description,
      status: schema.tasks.status,
      due_on: schema.tasks.due_on,
      assigned_by: schema.tasks.assigned_by,
      created_at: schema.tasks.created_at,
    })
    .from(schema.tasks)
    .innerJoin(schema.employees, eq(schema.tasks.owner_id, schema.employees.id))
    .limit(limit)
    .offset(offset);

  const tasks = whereClause
    ? await baseQuery.where(whereClause)
    : await baseQuery;

  return successResponse({ tasks, total, page, limit });
}

// GET single task
async function handleGet(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // id is required
  if (!id) {
    return ErrorResponses.badRequest("id is required");
  }

  // Get task with owner details
  const ownerEmployee = schema.employees;
  const assignedByEmployee = schema.employees;

  const [task] = await db
    .select({
      id: schema.tasks.id,
      owner_id: schema.tasks.owner_id,
      owner_name: ownerEmployee.full_name,
      owner_code: ownerEmployee.employee_code,
      entity_type: schema.tasks.entity_type,
      entity_id: schema.tasks.entity_id,
      description: schema.tasks.description,
      status: schema.tasks.status,
      due_on: schema.tasks.due_on,
      assigned_by: schema.tasks.assigned_by,
      created_at: schema.tasks.created_at,
    })
    .from(schema.tasks)
    .innerJoin(ownerEmployee, eq(schema.tasks.owner_id, ownerEmployee.id))
    .where(eq(schema.tasks.id, id));

  if (!task) {
    return ErrorResponses.notFound("Task");
  }

  // Get assigned_by employee name separately (handle NULL for system tasks)
  let assignedByName = "System";
  if (task.assigned_by) {
    const [assignedByEmp] = await db
      .select({ full_name: schema.employees.full_name })
      .from(schema.employees)
      .where(eq(schema.employees.id, task.assigned_by));
    assignedByName = assignedByEmp?.full_name || "System";
  }

  const taskWithAssigner = {
    ...task,
    assigned_by_name: assignedByName,
  };

  // Check access based on role
  if (checkRole(user, ["employee"])) {
    // Employee can only view their own tasks
    if (taskWithAssigner.owner_id !== user.id) {
      return ErrorResponses.accessDenied();
    }
  } else if (checkRole(user, ["project_manager"])) {
    // PM can view team tasks or tasks they assigned
    const isTeamMember = await isInPMTeam(taskWithAssigner.owner_id, user.id);
    if (
      taskWithAssigner.owner_id !== user.id &&
      !isTeamMember &&
      taskWithAssigner.assigned_by !== user.id
    ) {
      return ErrorResponses.accessDenied();
    }
  }
  // hr_executive can view any task

  return successResponse({ task: taskWithAssigner });
}

// DELETE /api/tasks?id={id} - Delete task (HR only)
async function handleDelete(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!checkRole(user, ["hr_executive"])) {
    return ErrorResponses.accessDenied();
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return ErrorResponses.badRequest("id is required");
  }

  // Get task first to check if it exists
  const [task] = await db
    .select()
    .from(schema.tasks)
    .where(eq(schema.tasks.id, id));

  if (!task) {
    return ErrorResponses.notFound("Task");
  }

  // Delete task
  await db.delete(schema.tasks).where(eq(schema.tasks.id, id));

  // Create audit log
  await createAuditLog({
    entity_type: "TASK",
    entity_id: id,
    operation: "DELETE",
    changed_by: user.id,
    changed_fields: {
      description: task.description,
      status: task.status,
      owner_id: task.owner_id,
    },
  });

  return successResponse({ id }, 200);
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreate(req);
  } catch (error) {
    console.error("Error creating task:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      return await handleGet(req);
    } else {
      return await handleList(req);
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return ErrorResponses.internalError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await handleDelete(req);
  } catch (error) {
    console.error("Error deleting task:", error);
    return ErrorResponses.internalError();
  }
}
