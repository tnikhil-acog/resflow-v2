import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { isInPMTeam } from "@/lib/db-helpers";
import { ErrorResponses, successResponse } from "@/lib/api-helpers";
import { eq } from "drizzle-orm";

// GET /api/reports/[id] - Get single report
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser(req);
    const { id } = await params;

    // Get report with employee details
    const [report] = await db
      .select({
        id: schema.reports.id,
        emp_id: schema.reports.emp_id,
        report_type: schema.reports.report_type,
        report_date: schema.reports.report_date,
        week_start_date: schema.reports.week_start_date,
        week_end_date: schema.reports.week_end_date,
        content: schema.reports.content,
        weekly_hours: schema.reports.weekly_hours,
        created_at: schema.reports.created_at,
        updated_at: schema.reports.updated_at,
        employee: {
          id: schema.employees.id,
          employee_name: schema.employees.full_name,
          employee_code: schema.employees.employee_code,
        },
      })
      .from(schema.reports)
      .innerJoin(
        schema.employees,
        eq(schema.reports.emp_id, schema.employees.id),
      )
      .where(eq(schema.reports.id, id));

    if (!report) {
      return ErrorResponses.notFound("Report");
    }

    // Check access based on role
    if (checkRole(user, ["employee"])) {
      // Employee can only view their own reports
      if (report.emp_id !== user.id) {
        return ErrorResponses.accessDenied();
      }
    } else if (checkRole(user, ["project_manager"])) {
      // PM can view team reports or their own
      if (report.emp_id !== user.id) {
        const isTeamMember = await isInPMTeam(report.emp_id, user.id);
        if (!isTeamMember) {
          return ErrorResponses.accessDenied();
        }
      }
    }
    // hr_executive can view any report

    return successResponse(report);
  } catch (error) {
    console.error("Error fetching report:", error);
    return ErrorResponses.internalError();
  }
}
