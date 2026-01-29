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

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json();
    const {
      emp_id,
      project_id,
      role,
      allocation_percentage,
      start_date,
      end_date,
      billability,
    } = body;

    // ---------------- VALIDATION ----------------

    if (
      !emp_id ||
      !project_id ||
      !role ||
      !allocation_percentage ||
      !start_date
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // ---------------- OVERLAP CHECK (NULL-SAFE) ----------------
    // Overlap rule:
    // existing.start <= new.end
    // AND
    // COALESCE(existing.end, '9999-12-31') >= new.start

    const overlapping = await db
      .select({
        total: sum(schema.projectAllocation.allocation_percentage),
      })
      .from(schema.projectAllocation)
      .where(
        and(
          eq(schema.projectAllocation.emp_id, emp_id),

          // existing.start <= new.end (or new.start if end_date is null)
          lte(schema.projectAllocation.start_date, endDateStr ?? startDateStr),

          // COALESCE(existing.end, infinity) >= new.start
          gte(
            sql`COALESCE(${schema.projectAllocation.end_date}, '9999-12-31')`,
            startDateStr,
          ),
        ),
      );

    const currentAllocation = Number(overlapping[0]?.total || 0);
    const totalAllocation = currentAllocation + Number(allocation_percentage);

    if (totalAllocation > 100) {
      return NextResponse.json(
        {
          error: `Employee allocation exceeds 100%. Current: ${currentAllocation}%, Requested: ${allocation_percentage}%, Total: ${totalAllocation}%`,
        },
        { status: 400 },
      );
    }

    // ---------------- INSERT ALLOCATION ----------------

    const [allocation] = await db
      .insert(schema.projectAllocation)
      .values({
        emp_id,
        project_id,
        role,
        allocation_percentage: allocation_percentage.toString(),
        start_date: startDateStr,
        end_date: endDateStr ?? null, // open-ended supported
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

    return NextResponse.json(allocation, { status: 201 });
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
    const emp_id = searchParams.get("emp_id");
    const project_id = searchParams.get("project_id");
    const active_only = searchParams.get("active_only") === "true";
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

    const whereClause =
      whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.projectAllocation)
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
        billability: schema.projectAllocation.billability,
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

      // Overlap rule:
      // existing.start <= new.end
      // AND
      // COALESCE(existing.end, +infinity) >= new.start

      const overlapping = await db
        .select({
          total: sum(schema.projectAllocation.allocation_percentage),
        })
        .from(schema.projectAllocation)
        .where(
          and(
            eq(schema.projectAllocation.emp_id, currentAllocation.emp_id),
            ne(schema.projectAllocation.id, id),

            // existing.start <= new.end (or new.start if end_date null)
            lte(
              schema.projectAllocation.start_date,
              newEndDateStr ?? startDateStr,
            ),

            // COALESCE(existing.end, infinity) >= new.start
            gte(
              sql`COALESCE(${schema.projectAllocation.end_date}, '9999-12-31')`,
              startDateStr,
            ),
          ),
        );

      const otherAllocations = Number(overlapping[0]?.total || 0);
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
