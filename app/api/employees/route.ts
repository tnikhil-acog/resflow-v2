// POST /api/employees/create
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { employee_code, ldap_username, full_name, email, gender, employee_type, employee_role, employee_design, working_location, department_id, reporting_manager_id, experience_years, resume_url, college, degree, educational_stream, joined_on }
// Check employee_code uniqueness, return 400 "employee_code already exists" if exists
// Check ldap_username uniqueness, return 400 "ldap_username already exists" if exists
// INSERT into employees table with status = 'ACTIVE'
// Return: { id, employee_code, ldap_username, full_name, email, status, joined_on }

// GET /api/employees/list
// Allowed Roles: employee, project_manager, hr_executive
// Query params: status, department_id, page, limit
// Data Filtering:
//   - employee: Returns list with ONLY (id, employee_code, full_name, email, employee_design)
//   - project_manager: Returns list with ONLY (id, employee_code, full_name, email, employee_design)
//   - hr_executive: Returns full data (all fields) + reporting_manager_name
// SELECT * FROM employees WHERE filters applied
// Apply pagination using LIMIT and OFFSET
// Return (employee/project_manager): { employees: [{ id, employee_code, full_name, email, employee_design }], total, page, limit }
// Return (hr_executive): { employees: [{ id, employee_code, ldap_username, full_name, email, gender, employee_type, employee_role, employee_design, working_location, department_id, reporting_manager_id, reporting_manager_name, status, joined_on, exited_on }], total, page, limit }

// GET /api/employees/get
// Allowed Roles: employee, project_manager, hr_executive
// Query param: id (required)
// Data Filtering:
//   - employee: Can view WHERE id = current_user_id, else return 403
//   - project_manager: Can view WHERE id = current_user_id OR id IN (SELECT emp_id FROM project_allocation WHERE project_id IN (SELECT id FROM projects WHERE project_manager_id = current_user_id)), else return 403
//   - hr_executive: Can view any employee
// SELECT * FROM employees WHERE id = ?
// Return: { id, employee_code, ldap_username, full_name, email, gender, employee_type, employee_role, employee_design, working_location, department_id, reporting_manager_id, reporting_manager_name, experience_years, resume_url, college, degree, educational_stream, status, joined_on, exited_on, project_managers: [{ project_id, project_name, manager_id, manager_name }] }
// Error 403 if access denied
// Error 404 if employee not found

// PUT /api/employees/update
// Allowed Roles: hr_executive
// Check JWT role = 'hr_executive', else return 403
// Accept: { id, full_name, email, gender, employee_type, employee_role, employee_design, working_location, department_id, reporting_manager_id, experience_years, resume_url, college, degree, educational_stream }
// Do NOT allow updating employee_code (return 400 "Cannot update employee_code")
// Do NOT allow updating ldap_username (return 400 "Cannot update ldap_username")
// UPDATE employees SET fields WHERE id = ?
// INSERT audit log with operation='UPDATE', changed_by=current_user_id
// Return: { id, employee_code, full_name, email, employee_design }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { toDateString } from "@/lib/date-utils";
import { checkUniqueness, getCount } from "@/lib/db-helpers";
import {
  ErrorResponses,
  validateRequiredFields,
  getPaginationParams,
  successResponse,
  validateDateOrder,
} from "@/lib/api-helpers";
import { eq, and, or, gt, ne, sql, inArray } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const {
      employee_code,
      ldap_username,
      full_name,
      email,
      gender,
      employee_type,
      employee_role,
      employee_design,
      working_location,
      department_id,
      reporting_manager_id,
      experience_years,
      resume_url,
      college,
      degree,
      educational_stream,
      joined_on,
    } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, [
      "employee_code",
      "ldap_username",
      "full_name",
      "email",
      "employee_type",
      "employee_role",
      "joined_on",
    ]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Check uniqueness
    const isCodeUnique = await checkUniqueness(
      schema.employees,
      schema.employees.employee_code,
      employee_code,
    );
    if (!isCodeUnique) {
      return ErrorResponses.conflict("employee_code already exists");
    }

    const isUsernameUnique = await checkUniqueness(
      schema.employees,
      schema.employees.ldap_username,
      ldap_username,
    );
    if (!isUsernameUnique) {
      return ErrorResponses.conflict("ldap_username already exists");
    }

    // Insert employee
    const [employee] = await db
      .insert(schema.employees)
      .values({
        employee_code,
        ldap_username,
        full_name,
        email,
        gender,
        employee_type,
        employee_role,
        employee_design,
        working_location,
        department_id,
        reporting_manager_id,
        experience_years: experience_years?.toString(),
        resume_url,
        college,
        educational_stream,
        status: "ACTIVE",
        joined_on: toDateString(joined_on)!,
      })
      .returning();

    await createAuditLog({
      entity_type: "EMPLOYEE",
      entity_id: employee.id,
      operation: "INSERT",
      changed_by: user.id,
      changed_fields: employee,
    });

    return successResponse(
      {
        id: employee.id,
        employee_code: employee.employee_code,
        ldap_username: employee.ldap_username,
        full_name: employee.full_name,
        email: employee.email,
        status: employee.status,
        joined_on: employee.joined_on,
      },
      201,
    );
  } catch (error) {
    console.error("Error creating employee:", error);
    return ErrorResponses.internalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    // Handle single employee retrieval
    if (action === "get") {
      return handleGetEmployee(req, user, searchParams);
    }

    // Handle list employees
    return handleListEmployees(req, user, searchParams);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return ErrorResponses.internalError();
  }
}

async function handleGetEmployee(
  req: NextRequest,
  user: any,
  searchParams: URLSearchParams,
) {
  const id = searchParams.get("id");

  if (!id) {
    return ErrorResponses.badRequest("Employee id is required");
  }

  // Check permissions
  if (user.employee_role === "employee") {
    if (id !== user.id) {
      return ErrorResponses.accessDenied();
    }
  } else if (user.employee_role === "project_manager") {
    // Check if viewing self or team member
    if (id !== user.id) {
      const managedProjects = await db
        .select({ id: schema.projects.id })
        .from(schema.projects)
        .where(eq(schema.projects.project_manager_id, user.id));

      const projectIds = managedProjects.map((p) => p.id);

      if (projectIds.length > 0) {
        const [allocation] = await db
          .select({ emp_id: schema.projectAllocation.emp_id })
          .from(schema.projectAllocation)
          .where(
            and(
              eq(schema.projectAllocation.emp_id, id),
              inArray(schema.projectAllocation.project_id, projectIds),
            ),
          )
          .limit(1);

        if (!allocation) {
          return ErrorResponses.accessDenied();
        }
      } else {
        return ErrorResponses.accessDenied();
      }
    }
  }

  // Fetch employee
  const [employee] = await db
    .select()
    .from(schema.employees)
    .where(eq(schema.employees.id, id));

  if (!employee) {
    return ErrorResponses.notFound("Employee");
  }

  // Fetch reporting manager name if exists
  let reporting_manager_name = null;
  if (employee.reporting_manager_id) {
    const [manager] = await db
      .select({ full_name: schema.employees.full_name })
      .from(schema.employees)
      .where(eq(schema.employees.id, employee.reporting_manager_id));
    reporting_manager_name = manager?.full_name || null;
  }

  // Fetch project managers (from project allocations)
  const project_managers = await db
    .select({
      project_id: schema.projects.id,
      project_name: schema.projects.project_name,
      manager_id: schema.projects.project_manager_id,
      manager_name: schema.employees.full_name,
    })
    .from(schema.projectAllocation)
    .innerJoin(
      schema.projects,
      eq(schema.projectAllocation.project_id, schema.projects.id),
    )
    .innerJoin(
      schema.employees,
      eq(schema.projects.project_manager_id, schema.employees.id),
    )
    .where(eq(schema.projectAllocation.emp_id, id));

  return successResponse({
    ...employee,
    reporting_manager_name,
    project_managers,
  });
}

async function handleListEmployees(
  req: NextRequest,
  user: any,
  searchParams: URLSearchParams,
) {
  const status = searchParams.get("status");
  const department_id = searchParams.get("department_id");
  const role = searchParams.get("role");
  const search = searchParams.get("search");
  const { page, limit, offset } = getPaginationParams(new URL(req.url));

  const whereConditions: any[] = [];

  if (status) {
    whereConditions.push(eq(schema.employees.status, status as any));
  }

  if (department_id) {
    whereConditions.push(eq(schema.employees.department_id, department_id));
  }

  if (role) {
    whereConditions.push(eq(schema.employees.employee_role, role as any));
  }

  // Add search condition - search across multiple fields
  if (search) {
    const searchLower = search.toLowerCase();
    whereConditions.push(
      or(
        sql`LOWER(${schema.employees.full_name}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${schema.employees.email}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${schema.employees.employee_code}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${schema.employees.ldap_username}) LIKE ${`%${searchLower}%`}`,
      ),
    );
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count
  const total = await getCount(schema.employees, whereClause);

  // Determine what fields to select based on role
  const isHrExecutive = user.employee_role === "hr_executive";

  if (isHrExecutive) {
    // HR Executive gets all fields with department name
    const employees = await db
      .select({
        id: schema.employees.id,
        employee_code: schema.employees.employee_code,
        ldap_username: schema.employees.ldap_username,
        full_name: schema.employees.full_name,
        email: schema.employees.email,
        gender: schema.employees.gender,
        employee_type: schema.employees.employee_type,
        employee_role: schema.employees.employee_role,
        employee_design: schema.employees.employee_design,
        working_location: schema.employees.working_location,
        department_id: schema.employees.department_id,
        department_name: schema.departments.name,
        reporting_manager_id: schema.employees.reporting_manager_id,
        experience_years: schema.employees.experience_years,
        resume_url: schema.employees.resume_url,
        college: schema.employees.college,
        educational_stream: schema.employees.educational_stream,
        status: schema.employees.status,
        joined_on: schema.employees.joined_on,
        exited_on: schema.employees.exited_on,
        created_at: schema.employees.created_at,
        updated_at: schema.employees.updated_at,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.department_id, schema.departments.id),
      )
      .where(whereClause)
      .orderBy(schema.employees.full_name)
      .limit(limit)
      .offset(offset);

    return successResponse({ employees, total, page, limit });
  } else {
    // Employee and Project Manager get limited fields with department name
    const employees = await db
      .select({
        id: schema.employees.id,
        employee_code: schema.employees.employee_code,
        full_name: schema.employees.full_name,
        email: schema.employees.email,
        employee_design: schema.employees.employee_design,
        employee_role: schema.employees.employee_role,
        department_name: schema.departments.name,
        status: schema.employees.status,
      })
      .from(schema.employees)
      .leftJoin(
        schema.departments,
        eq(schema.employees.department_id, schema.departments.id),
      )
      .where(whereClause)
      .orderBy(schema.employees.full_name)
      .limit(limit)
      .offset(offset);

    return successResponse({ employees, total, page, limit });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!checkRole(user, ["hr_executive"])) {
      return ErrorResponses.accessDenied();
    }

    const body = await req.json();
    const {
      id,
      employee_code,
      ldap_username,
      full_name,
      email,
      gender,
      employee_type,
      employee_role,
      employee_design,
      working_location,
      department_id,
      reporting_manager_id,
      experience_years,
      resume_url,
      college,
      degree,
      educational_stream,
    } = body;

    if (!id) {
      return ErrorResponses.badRequest("Employee id is required");
    }

    // Prevent updating immutable fields
    if (employee_code !== undefined) {
      return ErrorResponses.badRequest("Cannot update employee_code");
    }

    if (ldap_username !== undefined) {
      return ErrorResponses.badRequest("Cannot update ldap_username");
    }

    // Check if employee exists
    const [existing] = await db
      .select()
      .from(schema.employees)
      .where(eq(schema.employees.id, id));

    if (!existing) {
      return ErrorResponses.notFound("Employee");
    }

    // Build update data
    const updateData: any = { updated_at: new Date() };

    if (full_name !== undefined) updateData.full_name = full_name;
    if (email !== undefined) updateData.email = email;
    if (gender !== undefined) updateData.gender = gender;
    if (employee_type !== undefined) updateData.employee_type = employee_type;
    if (employee_role !== undefined) updateData.employee_role = employee_role;
    if (employee_design !== undefined)
      updateData.employee_design = employee_design;
    if (working_location !== undefined)
      updateData.working_location = working_location;
    if (department_id !== undefined) updateData.department_id = department_id;
    if (reporting_manager_id !== undefined)
      updateData.reporting_manager_id = reporting_manager_id;
    if (experience_years !== undefined)
      updateData.experience_years = experience_years.toString();
    if (resume_url !== undefined) updateData.resume_url = resume_url;
    if (college !== undefined) updateData.college = college;
    if (degree !== undefined) updateData.degree = degree;
    if (educational_stream !== undefined)
      updateData.educational_stream = educational_stream;

    const [updated] = await db
      .update(schema.employees)
      .set(updateData)
      .where(eq(schema.employees.id, id))
      .returning();

    await createAuditLog({
      entity_type: "EMPLOYEE",
      entity_id: id,
      operation: "UPDATE",
      changed_by: user.id,
      changed_fields: updateData,
    });

    return successResponse({
      id: updated.id,
      employee_code: updated.employee_code,
      full_name: updated.full_name,
      email: updated.email,
      employee_design: updated.employee_design,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return ErrorResponses.internalError();
  }
}
