import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import {
  checkUniqueness,
  getPMTeamMemberIds,
  isInPMTeam,
  getCount,
} from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import { eq, and, isNull, sql } from "drizzle-orm";

// POST /api/skills/create - Create new skill
async function handleCreate(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!checkRole(user, ["hr_executive"])) {
    return ErrorResponses.accessDenied();
  }

  const body = await req.json();
  const { skill_name, department_id } = body;

  // Validate required fields
  const missingFields = validateRequiredFields(body, [
    "skill_name",
    "department_id",
  ]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Check uniqueness
  const isUnique = await checkUniqueness(
    schema.skills,
    "skill_name",
    skill_name,
  );
  if (!isUnique) {
    return ErrorResponses.badRequest("skill_name already exists");
  }

  // Verify department exists
  const [department] = await db
    .select()
    .from(schema.departments)
    .where(eq(schema.departments.id, department_id));

  if (!department) {
    return ErrorResponses.notFound("Department");
  }

  // Insert skill
  const [skill] = await db
    .insert(schema.skills)
    .values({
      skill_name,
      department_id,
    })
    .returning();

  // Create audit log
  await createAuditLog({
    entity_type: "SKILL",
    entity_id: skill.skill_id,
    operation: "INSERT",
    changed_by: user.id,
    changed_fields: {
      skill_name,
      department_id,
    },
  });

  return successResponse(
    {
      skill_id: skill.skill_id,
      skill_name: skill.skill_name,
      department_id: skill.department_id,
      created_at: skill.created_at,
    },
    201,
  );
}

// GET /api/skills/list - List all skills with pagination
async function handleList(req: NextRequest) {
  await getCurrentUser(req); // Verify authentication

  const { searchParams } = new URL(req.url);
  const department_id = searchParams.get("department_id");
  const department_name = searchParams.get("department_name");
  const search = searchParams.get("search");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // Build where clause
  const whereConditions: any[] = [];

  if (department_id) {
    whereConditions.push(eq(schema.skills.department_id, department_id));
  }

  if (department_name) {
    whereConditions.push(eq(schema.departments.name, department_name));
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.toLowerCase()}%`;
    whereConditions.push(
      sql`(
        LOWER(${schema.skills.skill_name}) LIKE ${searchTerm} OR
        LOWER(${schema.departments.name}) LIKE ${searchTerm}
      )`,
    );
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.skills)
    .leftJoin(
      schema.departments,
      eq(schema.skills.department_id, schema.departments.id),
    )
    .where(whereClause);
  const total = Number(countResult.count);

  // Get skills with department details (using JOIN)
  const skills = await db
    .select({
      id: schema.skills.skill_id,
      skill_id: schema.skills.skill_id,
      skill_name: schema.skills.skill_name,
      department_id: schema.skills.department_id,
      department_name: schema.departments.name,
      created_at: schema.skills.created_at,
    })
    .from(schema.skills)
    .leftJoin(
      schema.departments,
      eq(schema.skills.department_id, schema.departments.id),
    )
    .where(whereClause)
    .orderBy(schema.skills.skill_name)
    .limit(limit)
    .offset(offset);

  return successResponse({ skills, total, page, limit });
}

// PUT /api/skills/update - Update existing skill
async function handleUpdate(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!checkRole(user, ["hr_executive"])) {
    return ErrorResponses.accessDenied();
  }

  const body = await req.json();
  const { skill_id, skill_name, department_id } = body;

  // Validate required fields
  const missingFields = validateRequiredFields(body, ["skill_id"]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Check if skill exists
  const [existingSkill] = await db
    .select()
    .from(schema.skills)
    .where(eq(schema.skills.skill_id, skill_id));

  if (!existingSkill) {
    return ErrorResponses.notFound("Skill");
  }

  // If skill_name is being updated, check uniqueness
  if (skill_name && skill_name !== existingSkill.skill_name) {
    const [duplicate] = await db
      .select()
      .from(schema.skills)
      .where(
        and(
          eq(schema.skills.skill_name, skill_name),
          sql`${schema.skills.skill_id} != ${skill_id}`,
        ),
      );

    if (duplicate) {
      return ErrorResponses.badRequest("skill_name already exists");
    }
  }

  // If department_id is being updated, verify it exists
  if (department_id && department_id !== existingSkill.department_id) {
    const [department] = await db
      .select()
      .from(schema.departments)
      .where(eq(schema.departments.id, department_id));

    if (!department) {
      return ErrorResponses.notFound("Department");
    }
  }

  // Update skill
  const updateData: any = {};
  if (skill_name) updateData.skill_name = skill_name;
  if (department_id) updateData.department_id = department_id;

  const [updatedSkill] = await db
    .update(schema.skills)
    .set(updateData)
    .where(eq(schema.skills.skill_id, skill_id))
    .returning();

  // Create audit log
  await createAuditLog({
    entity_type: "SKILL",
    entity_id: skill_id,
    operation: "UPDATE",
    changed_by: user.id,
    changed_fields: updateData,
  });

  return successResponse({
    skill_id: updatedSkill.skill_id,
    skill_name: updatedSkill.skill_name,
    department_id: updatedSkill.department_id,
  });
}

// DELETE /api/skills/delete - Delete skill
async function handleDelete(req: NextRequest) {
  const user = await getCurrentUser(req);

  if (!checkRole(user, ["hr_executive"])) {
    return ErrorResponses.accessDenied();
  }

  const body = await req.json();
  const { skill_id } = body;

  // Validate required fields
  const missingFields = validateRequiredFields(body, ["skill_id"]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Check if skill exists
  const [existingSkill] = await db
    .select()
    .from(schema.skills)
    .where(eq(schema.skills.skill_id, skill_id));

  if (!existingSkill) {
    return ErrorResponses.notFound("Skill");
  }

  // Check if skill is assigned to employees
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.employeeSkills)
    .where(eq(schema.employeeSkills.skill_id, skill_id));

  if (count > 0) {
    return ErrorResponses.badRequest(
      `Cannot delete skill. Assigned to ${count} employees`,
    );
  }

  // Delete skill
  await db.delete(schema.skills).where(eq(schema.skills.skill_id, skill_id));

  // Create audit log
  await createAuditLog({
    entity_type: "SKILL",
    entity_id: skill_id,
    operation: "DELETE",
    changed_by: user.id,
    changed_fields: {},
  });

  return successResponse({ message: "Skill deleted successfully" });
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreate(req);
  } catch (error) {
    console.error("Error creating skill:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    return await handleList(req);
  } catch (error) {
    console.error("Error fetching skills:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    return await handleUpdate(req);
  } catch (error) {
    console.error("Error updating skill:", error);
    return ErrorResponses.internalError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await handleDelete(req);
  } catch (error) {
    console.error("Error deleting skill:", error);
    return ErrorResponses.internalError();
  }
}
