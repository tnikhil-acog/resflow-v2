import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { checkUniqueness } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, sql } from "drizzle-orm";

// GET /api/departments
export async function GET(req: NextRequest) {
  return handleListDepartments(req);
}

// POST /api/departments
export async function POST(req: NextRequest) {
  return handleCreateDepartment(req);
}

// PUT /api/departments
export async function PUT(req: NextRequest) {
  return handleUpdateDepartment(req);
}

// DELETE /api/departments
export async function DELETE(req: NextRequest) {
  return handleDeleteDepartment(req);
}

/**
 * GET /api/departments/list
 * List all departments
 */
async function handleListDepartments(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // All authenticated users can view departments
    if (!checkRole(user, ["employee", "project_manager", "hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    // Fetch all departments
    const departments = await db
      .select({
        id: schema.departments.id,
        name: schema.departments.name,
        designations: schema.departments.designations,
      })
      .from(schema.departments)
      .orderBy(schema.departments.name);

    return successResponse({ departments });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error fetching departments:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * POST /api/departments/create
 * Create new department
 */
async function handleCreateDepartment(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR executives can create departments
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { name, designations } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["name"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check name uniqueness
    const isUnique = await checkUniqueness(schema.departments, "name", name);

    if (!isUnique) {
      return ErrorResponses.conflict("Department name already exists");
    }

    // Convert designations array to comma-separated string
    const designationsStr = Array.isArray(designations)
      ? designations.join(", ")
      : designations;

    // Insert new department
    const [newDepartment] = await db
      .insert(schema.departments)
      .values({
        name,
        designations: designationsStr || null,
      })
      .returning();

    return successResponse(
      {
        id: newDepartment.id,
        name: newDepartment.name,
        designations: newDepartment.designations,
      },
      201,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error creating department:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * PUT /api/departments
 * Update department
 */
async function handleUpdateDepartment(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR executives can update departments
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const { id, name, designations } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id", "name"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check if department exists
    const [existingDept] = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, id));

    if (!existingDept) {
      return ErrorResponses.notFound("Department");
    }

    // Check name uniqueness (exclude current department)
    const [duplicateDept] = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.name, name));

    if (duplicateDept && duplicateDept.id !== id) {
      return ErrorResponses.conflict("Department name already exists");
    }

    // Convert designations array to comma-separated string
    const designationsStr = Array.isArray(designations)
      ? designations.join(", ")
      : designations;

    // Update department
    const [updatedDepartment] = await db
      .update(schema.departments)
      .set({
        name,
        designations: designationsStr || null,
      })
      .where(eq(schema.departments.id, id))
      .returning();

    return successResponse({
      id: updatedDepartment.id,
      name: updatedDepartment.name,
      designations: updatedDepartment.designations,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error updating department:", error);
    return ErrorResponses.internalError();
  }
}

/**
 * DELETE /api/departments
 * Delete department
 */
async function handleDeleteDepartment(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    // Only HR executives can delete departments
    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return ErrorResponses.badRequest("Department id is required");
    }

    // Check if department exists
    const [existingDept] = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, id));

    if (!existingDept) {
      return ErrorResponses.notFound("Department");
    }

    // Check if department has employees
    const [employeeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.employees)
      .where(eq(schema.employees.department_id, id));

    if (employeeCount && employeeCount.count > 0) {
      return ErrorResponses.badRequest(
        `Cannot delete department. ${employeeCount.count} employee(s) are assigned to this department.`,
      );
    }

    // Delete department
    await db.delete(schema.departments).where(eq(schema.departments.id, id));

    return successResponse({ message: "Department deleted successfully" });
  } catch (error) {
    if (error instanceof Error && error.message.includes("token")) {
      return ErrorResponses.unauthorized("Invalid or expired token");
    }
    console.error("Error deleting department:", error);
    return ErrorResponses.internalError();
  }
}
