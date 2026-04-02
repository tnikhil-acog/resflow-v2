// GET /api/logs/aggregate
// Allowed Roles: employee (for own data), project_manager (for team), hr_executive (all)
// Query params: emp_id (optional), start_date (required), end_date (required)
// Purpose: Get aggregated hours by project for weekly report creation
// Data Filtering:
//   - employee: Must query own data (emp_id = current_user_id)
//   - project_manager: Can query team members
//   - hr_executive: Can query any employee
// SELECT project_id, SUM(hours) as total_hours FROM daily_project_logs
// WHERE emp_id = ? AND log_date BETWEEN ? AND ? AND locked = false
// GROUP BY project_id
// JOIN projects to get project_code
// Return: { weekly_hours: { "PR-001": 40, "PR-002": 10 }, start_date, end_date }

import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { isInPMTeam } from "@/lib/db-helpers";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const { searchParams } = new URL(req.url);
    let emp_id = searchParams.get("emp_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");

    // Validate required params
    if (!start_date || !end_date) {
      return ErrorResponses.badRequest("start_date and end_date are required");
    }

    // Default to current user if emp_id not provided
    if (!emp_id) {
      emp_id = user.id;
    }

    // Check access based on role
    if (checkRole(user, ["employee"])) {
      // Employee can only query their own data
      if (emp_id !== user.id) {
        return ErrorResponses.accessDenied();
      }
    } else if (checkRole(user, ["project_manager"])) {
      // PM can query team members or themselves
      if (emp_id !== user.id) {
        const isTeamMember = await isInPMTeam(emp_id, user.id);
        if (!isTeamMember) {
          return ErrorResponses.accessDenied();
        }
      }
    }
    // hr_executive can query any employee

    // Aggregate hours by project
    const aggregatedLogs = await db
      .select({
        project_id: schema.dailyProjectLogs.project_id,
        project_code: schema.projects.project_code,
        total_hours: sql<string>`SUM(${schema.dailyProjectLogs.hours})`,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .where(
        and(
          eq(schema.dailyProjectLogs.emp_id, emp_id),
          gte(schema.dailyProjectLogs.log_date, start_date),
          lte(schema.dailyProjectLogs.log_date, end_date),
          eq(schema.dailyProjectLogs.locked, false),
        ),
      )
      .groupBy(
        schema.dailyProjectLogs.project_id,
        schema.projects.project_code,
      );

    // Convert to object format
    const weekly_hours: Record<string, number> = {};
    for (const log of aggregatedLogs) {
      weekly_hours[log.project_code] = parseFloat(log.total_hours);
    }

    return successResponse({
      weekly_hours,
      start_date,
      end_date,
    });
  } catch (error) {
    console.error("Error aggregating logs:", error);
    return ErrorResponses.internalError();
  }
}
