// POST /api/allocations/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { emp_id, project_id, role, allocation_percentage, start_date, end_date, billability }
// Validate: end_date must be >= start_date, else return 400 "end_date must be >= start_date"
// Calculate total allocation: SELECT SUM(allocation_percentage) FROM project_allocation WHERE emp_id = ? AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
// If total + allocation_percentage > 100, return 400 "Employee allocation exceeds 100%. Current: X%, Requested: Y%, Total: Z%"
// INSERT into project_allocation table with assigned_by = current_user_id
// INSERT audit log with operation='INSERT', changed_by=current_user_id
// Return: { id, emp_id, project_id, role, allocation_percentage, start_date, end_date, billability, assigned_by }

// GET /api/allocations/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: emp_id, project_id, active_only, page, limit
// Data Filtering:
//   - employee: Returns WHERE emp_id = current_user_id
//   - project_manager: Returns WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)
//   - hr_executive: Returns all allocations
// active_only=true filters: WHERE start_date <= CURRENT_DATE AND (end_date IS NULL OR end_date >= CURRENT_DATE)
// SELECT * FROM project_allocation WHERE filters applied
// JOIN employees table to get employee_code, employee_name (full_name)
// JOIN projects table to get project_code, project_name
// Apply pagination using LIMIT and OFFSET
// Return: { allocations: [{ id, emp_id, employee_code, employee_name, project_id, project_code, project_name, role, allocation_percentage, start_date, end_date, billability, assigned_by }], total, page, limit }
// Error 403 if access denied

// PUT /api/allocations/update
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, allocation_percentage, end_date, billability}
// Get current allocation: SELECT emp_id, allocation_percentage, start_date, end_date FROM project_allocation WHERE id = ?
// Calculate total excluding this allocation: SELECT SUM(allocation_percentage) FROM project_allocation WHERE emp_id = ? AND id != ? AND ((start_date <= ? AND end_date >= ?) OR (start_date <= ? AND end_date >= ?))
// If total + new_allocation_percentage > 100, return 400 "Updated allocation exceeds 100%. Current other: X%, Requested: Y%, Total: Z%"
// UPDATE project_allocation SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, allocation_percentage, end_date, billability}

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import { eq, and, or, lte, gte, sql, sum, ne, inArray } from "drizzle-orm";

async function handleGetAllocation(req: NextRequest, user: any, id: string) {
  // Check permissions
  if (user.employee_role === "employee") {
    // Check if this allocation belongs to the employee
    const [allocation] = await db
      .select({ emp_id: schema.projectAllocation.emp_id })
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.id, id))
      .limit(1);

    if (!allocation || allocation.emp_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  } else if (user.employee_role === "project_manager") {
    // Check if this allocation is for one of their projects
    const [allocation] = await db
      .select({
        project_id: schema.projectAllocation.project_id,
        project_manager_id: schema.projects.project_manager_id,
      })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(eq(schema.projectAllocation.id, id))
      .limit(1);

    if (!allocation || allocation.project_manager_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
  }

  // Fetch allocation with details
  const [allocation] = await db
    .select({
      id: schema.projectAllocation.id,
      emp_id: schema.projectAllocation.emp_id,
      employee_code: schema.employees.employee_code,
      employee_name: schema.employees.full_name,
      project_id: schema.projectAllocation.project_id,
      project_code: schema.projects.project_code,
      project_name: schema.projects.project_name,
      role: schema.projectAllocation.role,
      allocation_percentage: schema.projectAllocation.allocation_percentage,
      start_date: schema.projectAllocation.start_date,
      end_date: schema.projectAllocation.end_date,
      is_billable: schema.projectAllocation.billability,
      assigned_by: schema.projectAllocation.assigned_by,
    })
    .from(schema.projectAllocation)
    .leftJoin(
      schema.employees,
      eq(schema.projectAllocation.emp_id, schema.employees.id),
    )
    .leftJoin(
      schema.projects,
      eq(schema.projectAllocation.project_id, schema.projects.id),
    )
    .where(eq(schema.projectAllocation.id, id))
    .limit(1);

  if (!allocation) {
    return NextResponse.json(
      { error: "Allocation not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ allocation });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      emp_id,
      emp_ids, // NEW: Array of employee IDs for bulk allocation
      project_id,
      role,
      allocation_percentage,
      start_date,
      end_date,
      billability,
    } = body;

    // Support both single and bulk allocation
    const employeeIds =
      emp_ids && Array.isArray(emp_ids) && emp_ids.length > 0
        ? emp_ids
        : emp_id
          ? [emp_id]
          : [];

    // ---------------- VALIDATION ----------------

    if (
      employeeIds.length === 0 ||
      !project_id ||
      !role ||
      !allocation_percentage ||
      !start_date
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields. Need emp_id or emp_ids, project_id, role, allocation_percentage, and start_date",
        },
        { status: 400 },
      );
    }

    if (end_date && new Date(end_date) < new Date(start_date)) {
      return NextResponse.json(
        { error: "end_date must be >= start_date" },
        { status: 400 },
      );
    }

    if (allocation_percentage <= 0 || allocation_percentage > 100) {
      return NextResponse.json(
        { error: "allocation_percentage must be between 1 and 100" },
        { status: 400 },
      );
    }

    const startDateStr = toDateString(start_date)!;
    const endDateStr = toDateString(end_date); // can be null

    // ---------------- PROCESS EACH EMPLOYEE ----------------
    const results = [];
    const errors = [];

    for (const currentEmpId of employeeIds) {
      try {
        // ---------------- OVERLAP CHECK (NULL-SAFE) ----------------
        const overlapping = await db
          .select({
            total: sum(schema.projectAllocation.allocation_percentage),
          })
          .from(schema.projectAllocation)
          .where(
            and(
              eq(schema.projectAllocation.emp_id, currentEmpId),
              lte(
                schema.projectAllocation.start_date,
                endDateStr ?? "9999-12-31",
              ),
              or(
                sql`${schema.projectAllocation.end_date} IS NULL`,
                gte(schema.projectAllocation.end_date, startDateStr),
              ),
            ),
          );

        const currentAllocation = overlapping[0]?.total
          ? parseFloat(overlapping[0].total.toString())
          : 0;

        const totalAllocation = currentAllocation + allocation_percentage;

        if (totalAllocation > 100) {
          errors.push({
            emp_id: currentEmpId,
            error: `Employee allocation exceeds 100%. Current: ${currentAllocation}%, Requested: ${allocation_percentage}%, Total: ${totalAllocation}%`,
          });
          continue; // Skip this employee
        }

        // ---------------- INSERT ALLOCATION ----------------
        const [allocation] = await db
          .insert(schema.projectAllocation)
          .values({
            emp_id: currentEmpId,
            project_id,
            role,
            allocation_percentage: allocation_percentage.toString(),
            start_date: startDateStr,
            end_date: endDateStr ?? null,
            billability: billability ?? true,
            assigned_by: user.id,
          })
          .returning();

        // ---------------- AUDIT LOG ----------------
        await createAuditLog({
          entity_type: "PROJECT_ALLOCATION",
          entity_id: allocation.id,
          operation: "INSERT",
          changed_by: user.id,
          changed_fields: allocation,
        });

        results.push(allocation);
      } catch (error) {
        console.error(
          `Error creating allocation for employee ${currentEmpId}:`,
          error,
        );
        errors.push({
          emp_id: currentEmpId,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create allocation",
        });
      }
    }

    // ---------------- COMPLETE ALLOCATION TASKS ----------------
    // Check if there are pending allocation tasks for this project
    // These would have been created when a demand was approved
    if (results.length > 0) {
      const allocationTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.entity_type, "DEMAND"),
            eq(schema.tasks.status, "DUE"),
            eq(schema.tasks.owner_id, user.id),
          ),
        );

      // Filter tasks that mention this project (basic check in description)
      const projectDetails = await db
        .select({
          project_name: schema.projects.project_name,
          project_code: schema.projects.project_code,
        })
        .from(schema.projects)
        .where(eq(schema.projects.id, project_id));

      let completedTasksCount = 0;

      if (allocationTasks.length > 0 && projectDetails.length > 0) {
        const projectName = projectDetails[0].project_name;
        const projectCode = projectDetails[0].project_code;

        // Complete tasks that are related to allocation and mention this project
        for (const task of allocationTasks) {
          if (
            task.description &&
            task.description.includes("Allocate resources") &&
            (task.description.includes(projectName) ||
              task.description.includes(projectCode))
          ) {
            await db
              .update(schema.tasks)
              .set({ status: "COMPLETED" })
              .where(eq(schema.tasks.id, task.id));

            await createAuditLog({
              entity_type: "TASK",
              entity_id: task.id,
              operation: "UPDATE",
              changed_by: user.id,
              changed_fields: {
                status: "COMPLETED",
                completion_reason: "Resource allocation created",
                allocation_id: results[0].id,
              },
            });

            completedTasksCount++;
          }
        }
      }

      // Return response for bulk allocation
      return NextResponse.json(
        {
          created: results.length,
          failed: errors.length,
          results: results,
          errors: errors,
          allocation_tasks_completed: completedTasksCount,
          message:
            errors.length === 0
              ? `${results.length} allocation(s) created successfully${completedTasksCount > 0 ? `. ${completedTasksCount} allocation task(s) completed.` : "."}`
              : `${results.length} allocation(s) created, ${errors.length} failed.`,
        },
        { status: 201 },
      );
    }

    // If no results, return error
    return NextResponse.json(
      {
        created: 0,
        failed: errors.length,
        errors: errors,
        message: "Failed to create any allocations",
      },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error creating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const id = searchParams.get("id");

    // Handle single allocation retrieval
    if (action === "get" && id) {
      return handleGetAllocation(req, user, id);
    }

    // Handle capacity check for an employee
    if (action === "capacity") {
      const employee_id = searchParams.get("employee_id");
      const exclude_allocation_id = searchParams.get("exclude_allocation_id");

      if (!employee_id) {
        return NextResponse.json(
          { error: "employee_id is required" },
          { status: 400 },
        );
      }

      // Calculate current total allocation for the employee
      const today = toDateString(new Date())!;

      // Build where conditions
      const conditions = [
        eq(schema.projectAllocation.emp_id, employee_id),
        lte(schema.projectAllocation.start_date, today),
        or(
          sql`${schema.projectAllocation.end_date} IS NULL`,
          gte(schema.projectAllocation.end_date, today),
        ),
      ];

      // Exclude the allocation being edited (if provided)
      if (exclude_allocation_id) {
        conditions.push(ne(schema.projectAllocation.id, exclude_allocation_id));
      }

      const result = await db
        .select({
          total: sum(schema.projectAllocation.allocation_percentage),
        })
        .from(schema.projectAllocation)
        .where(and(...conditions));

      const currentAllocation = result[0]?.total
        ? parseFloat(result[0].total.toString())
        : 0;
      const remainingCapacity = Math.max(0, 100 - currentAllocation);

      return NextResponse.json({
        employee_id,
        current_allocation: currentAllocation,
        remaining_capacity: remainingCapacity,
        excluded_allocation: exclude_allocation_id || null,
      });
    }

    // Handle list allocations
    const emp_id =
      searchParams.get("employee_id") || searchParams.get("emp_id");
    const project_id = searchParams.get("project_id");
    const active_only = searchParams.get("active_only") === "true";
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    const whereConditions: any[] = [];

    // Role-based filtering
    if (user.employee_role === "employee") {
      whereConditions.push(eq(schema.projectAllocation.emp_id, user.id));
    } else if (user.employee_role === "project_manager") {
      const managedProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      const projectIds = managedProjects.map((p) => p.id);
      if (projectIds.length === 0) {
        return NextResponse.json({ allocations: [], total: 0, page, limit });
      }
      whereConditions.push(
        inArray(schema.projectAllocation.project_id, projectIds),
      );
    }

    // Additional filters
    if (emp_id) {
      if (user.employee_role === "employee" && emp_id !== user.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      whereConditions.push(eq(schema.projectAllocation.emp_id, emp_id));
    }

    if (project_id) {
      whereConditions.push(eq(schema.projectAllocation.project_id, project_id));
    }

    if (active_only) {
      const today = toDateString(new Date())!;
      whereConditions.push(
        and(
          lte(schema.projectAllocation.start_date, today),
          or(
            sql`${schema.projectAllocation.end_date} IS NULL`,
            gte(schema.projectAllocation.end_date, today),
          ),
        ),
      );
    }

    // Search filter
    if (search && search.trim()) {
      const searchTerm = `%${search.toLowerCase()}%`;
      whereConditions.push(
        sql`(
          LOWER(${schema.employees.full_name}) LIKE ${searchTerm} OR
          LOWER(${schema.employees.employee_code}) LIKE ${searchTerm} OR
          LOWER(${schema.projects.project_name}) LIKE ${searchTerm} OR
          LOWER(${schema.projects.project_code}) LIKE ${searchTerm} OR
          LOWER(${schema.projectAllocation.role}) LIKE ${searchTerm}
        )`,
      );
    }

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.employees,
        eq(schema.projectAllocation.emp_id, schema.employees.id),
      )
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(whereClause);
    const total = Number(countResult.count);

    // Get paginated data with joins
    const allocations = await db
      .select({
        id: schema.projectAllocation.id,
        emp_id: schema.projectAllocation.emp_id,
        employee_code: schema.employees.employee_code,
        employee_name: schema.employees.full_name,
        project_id: schema.projectAllocation.project_id,
        project_code: schema.projects.project_code,
        project_name: schema.projects.project_name,
        role: schema.projectAllocation.role,
        allocation_percentage: schema.projectAllocation.allocation_percentage,
        start_date: schema.projectAllocation.start_date,
        end_date: schema.projectAllocation.end_date,
        is_billable: schema.projectAllocation.billability,
        assigned_by: schema.projectAllocation.assigned_by,
      })
      .from(schema.projectAllocation)
      .leftJoin(
        schema.employees,
        eq(schema.projectAllocation.emp_id, schema.employees.id),
      )
      .leftJoin(
        schema.projects,
        eq(schema.projectAllocation.project_id, schema.projects.id),
      )
      .where(whereClause)
      .orderBy(sql`${schema.projectAllocation.start_date} DESC`)
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ allocations, total, page, limit });
  } catch (error) {
    console.error("Error fetching allocations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const { id, allocation_percentage, end_date, billability } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Allocation id is required" },
        { status: 400 },
      );
    }

    // ---------------- FETCH CURRENT ALLOCATION ----------------

    const [currentAllocation] = await db
      .select()
      .from(schema.projectAllocation)
      .where(eq(schema.projectAllocation.id, id));

    if (!currentAllocation) {
      return NextResponse.json(
        { error: "Allocation not found" },
        { status: 404 },
      );
    }

    console.log("[ALLOCATION UPDATE] Current allocation being edited:", {
      id: currentAllocation.id,
      emp_id: currentAllocation.emp_id,
      percentage: currentAllocation.allocation_percentage,
      start_date: currentAllocation.start_date,
      end_date: currentAllocation.end_date,
    });

    // ---------------- VALIDATE ALLOCATION % CHANGE ----------------

    if (
      allocation_percentage !== undefined &&
      allocation_percentage !== Number(currentAllocation.allocation_percentage)
    ) {
      const newEndDateStr =
        end_date !== undefined
          ? toDateString(end_date) // can be null
          : currentAllocation.end_date;

      const startDateStr = currentAllocation.start_date;

      // Overlap rule for finding conflicting allocations:
      // An allocation overlaps with the period [startDateStr, newEndDateStr] if:
      // existing.start_date <= (newEndDateStr OR '9999-12-31')
      // AND COALESCE(existing.end_date, '9999-12-31') >= startDateStr

      // Handle null end date - treat as ongoing (far future date)
      const effectiveEndDate = newEndDateStr || "9999-12-31";

      console.log("[ALLOCATION UPDATE] Checking overlap for:", {
        emp_id: currentAllocation.emp_id,
        exclude_id: id,
        start_date: startDateStr,
        end_date: effectiveEndDate,
        current_percentage: currentAllocation.allocation_percentage,
      });

      // Debug: Get all matching allocations to see what's being included
      // Overlap rule: Two allocations overlap if they share any common day
      // existing.start_date < edited.end_date (or infinity)
      // AND existing.end_date (or infinity) > edited.start_date
      // Using strict inequalities so allocations on boundary dates don't overlap
      // (e.g., one ending on Feb 15 and another starting on Feb 15 = no overlap)
      const debugAllocations = await db
        .select({
          id: schema.projectAllocation.id,
          percentage: schema.projectAllocation.allocation_percentage,
          start_date: schema.projectAllocation.start_date,
          end_date: schema.projectAllocation.end_date,
        })
        .from(schema.projectAllocation)
        .where(
          and(
            eq(schema.projectAllocation.emp_id, currentAllocation.emp_id),
            ne(schema.projectAllocation.id, id),
            // existing.start < edited.end
            sql`${schema.projectAllocation.start_date} < ${effectiveEndDate}`,
            // existing.end > edited.start (use COALESCE for null end dates)
            sql`COALESCE(${schema.projectAllocation.end_date}, '9999-12-31') > ${startDateStr}`,
          ),
        );

      console.log(
        "[ALLOCATION UPDATE] Found overlapping allocations:",
        debugAllocations,
      );

      const overlapping = await db
        .select({
          total: sum(schema.projectAllocation.allocation_percentage),
        })
        .from(schema.projectAllocation)
        .where(
          and(
            eq(schema.projectAllocation.emp_id, currentAllocation.emp_id),
            ne(schema.projectAllocation.id, id), // Exclude the allocation being edited

            // existing.start < edited.end
            sql`${schema.projectAllocation.start_date} < ${effectiveEndDate}`,

            // existing.end > edited.start (use COALESCE for null end dates)
            sql`COALESCE(${schema.projectAllocation.end_date}, '9999-12-31') > ${startDateStr}`,
          ),
        );

      const otherAllocations = Number(overlapping[0]?.total || 0);

      console.log("[ALLOCATION UPDATE] Overlap result:", {
        otherAllocations,
        requestedPercentage: allocation_percentage,
        total: otherAllocations + Number(allocation_percentage),
      });
      const totalAllocation = otherAllocations + Number(allocation_percentage);

      if (totalAllocation > 100) {
        return NextResponse.json(
          {
            error: `Updated allocation exceeds 100%. Current other: ${otherAllocations}%, Requested: ${allocation_percentage}%, Total: ${totalAllocation}%`,
          },
          { status: 400 },
        );
      }
    }

    // ---------------- BUILD UPDATE DATA ----------------

    const updateData: any = { updated_at: new Date() };

    if (allocation_percentage !== undefined) {
      updateData.allocation_percentage = allocation_percentage.toString();
    }

    if (end_date !== undefined) {
      updateData.end_date = toDateString(end_date); // null allowed
    }

    if (billability !== undefined) {
      updateData.billability = billability;
    }

    // ---------------- UPDATE ----------------

    const [updatedAllocation] = await db
      .update(schema.projectAllocation)
      .set(updateData)
      .where(eq(schema.projectAllocation.id, id))
      .returning();

    // ---------------- AUDIT ----------------

    await createAuditLog({
      entity_type: "PROJECT_ALLOCATION",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: updateData,
    });

    return NextResponse.json({
      id: updatedAllocation.id,
      allocation_percentage: updatedAllocation.allocation_percentage,
      end_date: updatedAllocation.end_date,
      billability: updatedAllocation.billability,
    });
  } catch (error) {
    console.error("Error updating allocation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
