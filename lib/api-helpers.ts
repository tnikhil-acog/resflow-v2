/**
 * Common API helper functions to avoid code repetition
 */

import { NextRequest, NextResponse } from "next/server";
import { User } from "./auth";
import { schema } from "./db";

/**
 * Standard error responses
 */
export const ErrorResponses = {
  accessDenied: () =>
    NextResponse.json({ error: "Access denied" }, { status: 403 }),
  unauthorized: (message: string = "Unauthorized") =>
    NextResponse.json({ error: message }, { status: 401 }),
  notFound: (resource: string = "Resource") =>
    NextResponse.json({ error: `${resource} not found` }, { status: 404 }),
  badRequest: (message: string) =>
    NextResponse.json({ error: message }, { status: 400 }),
  missingFields: () =>
    NextResponse.json({ error: "Missing required fields" }, { status: 400 }),
  internalError: () =>
    NextResponse.json({ error: "Internal server error" }, { status: 500 }),
  conflict: (message: string) =>
    NextResponse.json({ error: message }, { status: 409 }),
};

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[],
): string | null {
  const missing = requiredFields.filter(
    (field) => !body[field] && body[field] !== 0 && body[field] !== false,
  );
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(", ")}`;
  }
  return null;
}

/**
 * Extract pagination parameters from URL
 */
export function getPaginationParams(url: URL) {
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/**
 * Check if user has any of the required roles
 */
export function requireRole(user: User, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.employee_role);
}

/**
 * Validate date comparison (date1 >= date2)
 */
export function validateDateOrder(
  date1: string | Date,
  date2: string | Date,
  errorMessage: string,
): string | null {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  if (d1 < d2) {
    return errorMessage;
  }
  return null;
}

/**
 * Standard success response with data
 */
export function successResponse(data: any, status: number = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Standard paginated response
 */
export function paginatedResponse(
  items: any[],
  total: number,
  page: number,
  limit: number,
) {
  return NextResponse.json({
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

/**
 * Project status transition rules
 */
type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";

export const PROJECT_STATUS_TRANSITIONS: Record<
  "project_manager" | "hr_executive",
  Record<ProjectStatus, ProjectStatus[]>
> = {
  project_manager: {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["ON_HOLD"],
    ON_HOLD: ["ACTIVE"],
    COMPLETED: [],
    CANCELLED: [],
  },
  hr_executive: {
    DRAFT: ["ACTIVE"],
    ACTIVE: ["ON_HOLD", "COMPLETED", "CANCELLED"],
    ON_HOLD: ["ACTIVE", "COMPLETED", "CANCELLED"],
    COMPLETED: [],
    CANCELLED: [],
  },
};

/**
 * Validate project status transition
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string,
  userRole: string,
): { valid: boolean; error?: string } {
  const roleKey =
    userRole === "hr_executive" ? "hr_executive" : "project_manager";
  const allowedTransitions =
    PROJECT_STATUS_TRANSITIONS[roleKey][currentStatus as ProjectStatus];

  if (!allowedTransitions) {
    return { valid: false, error: `Invalid current status: ${currentStatus}` };
  }

  if (!allowedTransitions.includes(newStatus as ProjectStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}

/**
 * Get allowed status transitions for a role
 */
export function getAllowedStatusTransitions(
  currentStatus: string,
  userRole: string,
): string[] {
  const roleKey =
    userRole === "hr_executive" ? "hr_executive" : "project_manager";
  return (
    PROJECT_STATUS_TRANSITIONS[roleKey][currentStatus as ProjectStatus] || []
  );
}

/**
 * Build audit log filters from query parameters
 * Returns array of Drizzle ORM filter conditions
 */
export function buildAuditFilters(
  searchParams: URLSearchParams,
  drizzleOps: any,
) {
  const filters: any[] = [];
  const { eq, gte, lt, sql } = drizzleOps;

  // Filter by entity_type
  const entity_type = searchParams.get("entity_type");
  if (entity_type) {
    filters.push(eq(schema.auditLogs.entity_type, entity_type));
  }

  // Filter by entity_id
  const entity_id = searchParams.get("entity_id");
  if (entity_id) {
    filters.push(eq(schema.auditLogs.entity_id, entity_id));
  }

  // Filter by operation
  const operation = searchParams.get("operation");
  if (operation) {
    filters.push(eq(schema.auditLogs.operation, operation));
  }

  // Filter by changed_by
  const changed_by = searchParams.get("changed_by");
  if (changed_by) {
    filters.push(eq(schema.auditLogs.changed_by, changed_by));
  }

  // Search filter
  const search = searchParams.get("search");
  if (search && search.trim()) {
    const searchTerm = `%${search.toLowerCase()}%`;
    filters.push(sql`LOWER(${schema.auditLogs.entity_id}) LIKE ${searchTerm}`);
  }

  // Filter by date range
  const start_date = searchParams.get("start_date");
  const end_date = searchParams.get("end_date");

  if (start_date) {
    filters.push(gte(schema.auditLogs.changed_at, new Date(start_date)));
  }

  if (end_date) {
    // Add one day to include the entire end_date
    const endDateTime = new Date(end_date);
    endDateTime.setDate(endDateTime.getDate() + 1);
    filters.push(lt(schema.auditLogs.changed_at, endDateTime));
  }

  return filters;
}
