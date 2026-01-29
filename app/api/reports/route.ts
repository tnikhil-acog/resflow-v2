import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getCurrentUser, checkRole } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { getPMTeamMemberIds, isInPMTeam, getCount } from "@/lib/db-helpers";
import { toDateString } from "@/lib/date-utils";
import {
  ErrorResponses,
  validateRequiredFields,
  successResponse,
} from "@/lib/api-helpers";
import {
  eq,
  and,
  isNull,
  isNotNull,
  inArray,
  or,
  sql,
  gte,
  lte,
} from "drizzle-orm";

// POST /api/reports/create - Create draft report
async function handleCreate(req: NextRequest) {
  const user = await getCurrentUser(req);

  const body = await req.json();
  const {
    report_type,
    week_start_date,
    week_end_date,
    report_date,
    content,
    weekly_hours,
  } = body;

  // Validate required fields
  const missingFields = validateRequiredFields(body, [
    "report_type",
    "content",
  ]);
  if (missingFields) {
    return ErrorResponses.badRequest(missingFields);
  }

  // Use authenticated user's ID
  const emp_id = user.id;

  // Validate report_type and date fields
  if (report_type === "WEEKLY") {
    if (!week_start_date || !week_end_date) {
      return ErrorResponses.badRequest(
        "week_start_date and week_end_date are required for WEEKLY reports",
      );
    }
  } else if (report_type === "DAILY") {
    if (!report_date) {
      return ErrorResponses.badRequest(
        "report_date is required for DAILY reports",
      );
    }
  } else {
    return ErrorResponses.badRequest("Invalid report_type");
  }

  // Check for duplicate
  if (report_type === "WEEKLY") {
    const [existing] = await db
      .select()
      .from(schema.reports)
      .where(
        and(
          eq(schema.reports.emp_id, emp_id),
          eq(schema.reports.week_start_date, week_start_date),
          eq(schema.reports.week_end_date, week_end_date),
          eq(schema.reports.report_type, report_type),
        ),
      );

    if (existing) {
      return ErrorResponses.badRequest(
        "Report already exists for this employee and date range",
      );
    }
  }

  // Use provided weekly_hours or aggregate from daily logs for WEEKLY reports
  let finalWeeklyHours: Record<string, number> | null = null;
  if (report_type === "WEEKLY") {
    if (weekly_hours && Object.keys(weekly_hours).length > 0) {
      // Use provided weekly_hours
      finalWeeklyHours = weekly_hours;
    } else {
      // Aggregate from daily logs
      const aggregatedLogs = await db
        .select({
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
            gte(schema.dailyProjectLogs.log_date, week_start_date),
            lte(schema.dailyProjectLogs.log_date, week_end_date),
            eq(schema.dailyProjectLogs.locked, false),
          ),
        )
        .groupBy(schema.projects.project_code);

      finalWeeklyHours = {};
      for (const log of aggregatedLogs) {
        finalWeeklyHours[log.project_code] = parseFloat(log.total_hours);
      }
    }
  }

  // Insert report
  const [report] = await db
    .insert(schema.reports)
    .values({
      emp_id,
      report_type,
      report_date: report_date || null,
      week_start_date: week_start_date || null,
      week_end_date: week_end_date || null,
      content,
      weekly_hours: finalWeeklyHours as any,
    })
    .returning();

  // Create audit log
  await createAuditLog({
    entity_type: "REPORT",
    entity_id: report.id,
    operation: "INSERT",
    changed_by: user.id,
    changed_fields: {
      emp_id,
      report_type,
      report_date,
      week_start_date,
      week_end_date,
      content,
    },
  });

  return successResponse(
    {
      id: report.id,
      emp_id: report.emp_id,
      report_type: report.report_type,
      report_date: report.report_date,
      week_start_date: report.week_start_date,
      week_end_date: report.week_end_date,
      content: report.content,
      weekly_hours: report.weekly_hours,
      created_at: report.created_at,
    },
    201,
  );
}

// GET /api/reports/list - List reports with filters
async function handleList(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const emp_id = searchParams.get("emp_id");
  const report_type = searchParams.get("report_type");
  const week_start_date = searchParams.get("week_start_date");
  const week_end_date = searchParams.get("week_end_date");
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // Build where clause based on role
  let whereConditions: any[] = [];

  if (checkRole(user, ["employee"])) {
    // Employee can only see their own reports
    whereConditions.push(eq(schema.reports.emp_id, user.id));
  } else if (checkRole(user, ["project_manager"])) {
    // PM can see team reports or their own
    const teamMemberIds = await getPMTeamMemberIds(user.id);
    whereConditions.push(inArray(schema.reports.emp_id, teamMemberIds));
  }
  // hr_executive can see all reports

  // Apply filters
  if (emp_id) {
    whereConditions.push(eq(schema.reports.emp_id, emp_id));
  }
  if (report_type) {
    whereConditions.push(
      eq(schema.reports.report_type, report_type as "DAILY" | "WEEKLY"),
    );
  }
  if (week_start_date) {
    whereConditions.push(eq(schema.reports.week_start_date, week_start_date));
  }
  if (week_end_date) {
    whereConditions.push(eq(schema.reports.week_end_date, week_end_date));
  }
  if (status === "DRAFT") {
    whereConditions.push(isNull(schema.reports.report_date));
  } else if (status === "SUBMITTED") {
    whereConditions.push(isNotNull(schema.reports.report_date));
  }

  const whereClause =
    whereConditions.length > 0 ? and(...whereConditions) : undefined;

  // Get total count
  const total = await getCount(schema.reports, whereClause);

  // Get reports with employee details
  const baseQuery = db
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
    .innerJoin(schema.employees, eq(schema.reports.emp_id, schema.employees.id))
    .limit(limit)
    .offset(offset);

  const reports = whereClause
    ? await baseQuery.where(whereClause)
    : await baseQuery;

  return successResponse({ reports, total, page, limit });
}

// GET single report
async function handleGet(req: NextRequest) {
  const user = await getCurrentUser(req);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  // id is required
  if (!id) {
    return ErrorResponses.badRequest("id is required");
  }

  // Get report with employee details
  const [report] = await db
    .select({
      id: schema.reports.id,
      emp_id: schema.reports.emp_id,
      employee_code: schema.employees.employee_code,
      employee_name: schema.employees.full_name,
      report_type: schema.reports.report_type,
      report_date: schema.reports.report_date,
      week_start_date: schema.reports.week_start_date,
      week_end_date: schema.reports.week_end_date,
      content: schema.reports.content,
      weekly_hours: schema.reports.weekly_hours,
      created_at: schema.reports.created_at,
    })
    .from(schema.reports)
    .innerJoin(schema.employees, eq(schema.reports.emp_id, schema.employees.id))
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

  return successResponse({
    ...report,
    status: report.report_date ? "SUBMITTED" : "DRAFT",
  });
}

export async function POST(req: NextRequest) {
  try {
    return await handleCreate(req);
  } catch (error) {
    console.error("Error creating report:", error);
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
    console.error("Error fetching reports:", error);
    return ErrorResponses.internalError();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    const body = await req.json();
    const { id, content, report_date } = body;

    // Validate required fields
    const missingFields = validateRequiredFields(body, ["id"]);
    if (missingFields) {
      return ErrorResponses.badRequest(missingFields);
    }

    // Get report
    const [report] = await db
      .select()
      .from(schema.reports)
      .where(eq(schema.reports.id, id));

    if (!report) {
      return ErrorResponses.notFound("Report");
    }

    // Check if report is already submitted
    const isSubmitted = report.report_date !== null;

    if (isSubmitted) {
      // Only HR can edit submitted reports
      if (!checkRole(user, ["hr_executive"])) {
        return ErrorResponses.badRequest("Cannot edit submitted report");
      }
    } else {
      // Draft reports: check ownership
      if (report.emp_id !== user.id && !checkRole(user, ["hr_executive"])) {
        return ErrorResponses.accessDenied();
      }
    }

    // If submitting the report (setting report_date)
    if (report_date && !isSubmitted) {
      // Re-aggregate weekly_hours
      let weekly_hours: Record<string, number> | null = null;
      if (report.report_type === "WEEKLY") {
        const aggregatedLogs = await db
          .select({
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
              eq(schema.dailyProjectLogs.emp_id, report.emp_id),
              gte(schema.dailyProjectLogs.log_date, report.week_start_date!),
              lte(schema.dailyProjectLogs.log_date, report.week_end_date!),
              eq(schema.dailyProjectLogs.locked, false),
            ),
          )
          .groupBy(schema.projects.project_code);

        weekly_hours = {};
        for (const log of aggregatedLogs) {
          weekly_hours[log.project_code] = parseFloat(log.total_hours);
        }
      }

      // Update report and lock daily logs in transaction
      await db.transaction(async (tx) => {
        // Update report
        await tx
          .update(schema.reports)
          .set({
            report_date: toDateString(new Date()),
            content: content || report.content,
            weekly_hours: weekly_hours as any,
          })
          .where(eq(schema.reports.id, id));

        // Lock corresponding daily logs for WEEKLY reports
        if (report.report_type === "WEEKLY") {
          await tx
            .update(schema.dailyProjectLogs)
            .set({ locked: true })
            .where(
              and(
                eq(schema.dailyProjectLogs.emp_id, report.emp_id),
                gte(schema.dailyProjectLogs.log_date, report.week_start_date!),
                lte(schema.dailyProjectLogs.log_date, report.week_end_date!),
              ),
            );
        }
      });

      // Create audit log
      await createAuditLog({
        entity_type: "REPORT",
        entity_id: id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: {
          report_date,
          content: content || report.content,
          status: "SUBMITTED",
        },
      });

      const [updated] = await db
        .select()
        .from(schema.reports)
        .where(eq(schema.reports.id, id));

      return successResponse({
        id: updated.id,
        emp_id: updated.emp_id,
        report_type: updated.report_type,
        report_date: updated.report_date,
        content: updated.content,
        weekly_hours: updated.weekly_hours,
        status: "SUBMITTED",
      });
    } else {
      // Just updating content
      const [updated] = await db
        .update(schema.reports)
        .set({ content: content || report.content })
        .where(eq(schema.reports.id, id))
        .returning();

      // Create audit log
      await createAuditLog({
        entity_type: "REPORT",
        entity_id: id,
        operation: "UPDATE",
        changed_by: user.id,
        changed_fields: { content },
      });

      return successResponse({
        id: updated.id,
        emp_id: updated.emp_id,
        report_type: updated.report_type,
        report_date: updated.report_date,
        content: updated.content,
        weekly_hours: updated.weekly_hours,
        status: updated.report_date ? "SUBMITTED" : "DRAFT",
      });
    }
  } catch (error) {
    console.error("Error updating report:", error);
    return ErrorResponses.internalError();
  }
}
