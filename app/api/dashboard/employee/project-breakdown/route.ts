import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { schema } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);

    const { searchParams } = new URL(request.url);
    const weekStart = searchParams.get("week_start");

    if (!weekStart) {
      return NextResponse.json(
        { error: "week_start is required" },
        { status: 400 },
      );
    }

    // Calculate week end (6 days after start)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEnd = endDate.toISOString().split("T")[0];

    // Employees can only see their own data, PM/HR can specify emp_id
    const empId = searchParams.get("emp_id") || user.id;

    // If requesting someone else's data, must be PM or HR
    if (
      empId !== user.id &&
      user.employee_role !== "project_manager" &&
      user.employee_role !== "hr_executive"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get project breakdown
    const projectData = await db
      .select({
        project_id: schema.dailyProjectLogs.project_id,
        project_name: schema.projects.project_name,
        client_name: schema.clients.client_name,
        hours:
          sql<number>`COALESCE(SUM(${schema.dailyProjectLogs.hours}), 0)`.as(
            "hours",
          ),
        billability: schema.projectAllocation.billability,
      })
      .from(schema.dailyProjectLogs)
      .innerJoin(
        schema.projects,
        eq(schema.dailyProjectLogs.project_id, schema.projects.id),
      )
      .leftJoin(
        schema.clients,
        eq(schema.projects.client_id, schema.clients.id),
      )
      .leftJoin(
        schema.projectAllocation,
        and(
          eq(
            schema.dailyProjectLogs.project_id,
            schema.projectAllocation.project_id,
          ),
          eq(schema.dailyProjectLogs.emp_id, schema.projectAllocation.emp_id),
        ),
      )
      .where(
        and(
          eq(schema.dailyProjectLogs.emp_id, empId),
          gte(schema.dailyProjectLogs.log_date, weekStart),
          lte(schema.dailyProjectLogs.log_date, weekEnd),
        ),
      )
      .groupBy(
        schema.dailyProjectLogs.project_id,
        schema.projects.project_name,
        schema.clients.client_name,
        schema.projectAllocation.billability,
      )
      .orderBy(sql`hours DESC`);

    // Calculate total hours
    const totalHours = projectData.reduce(
      (sum, project) => sum + parseFloat(project.hours.toString()),
      0,
    );

    // Format the data with percentages
    const formattedProjects = projectData.map((project) => ({
      project_id: project.project_id,
      project_name: project.project_name,
      client_name: project.client_name || "Internal",
      hours: parseFloat(project.hours.toString()),
      billability: project.billability || false,
      percentage:
        totalHours > 0
          ? Math.round(
              (parseFloat(project.hours.toString()) / totalHours) * 100,
            )
          : 0,
    }));

    return NextResponse.json({
      projects: formattedProjects,
      total_hours: totalHours,
      week_start: weekStart,
      week_end: weekEnd,
    });
  } catch (error) {
    console.error("Error fetching project breakdown:", error);
    return NextResponse.json(
      { error: "Failed to fetch project breakdown" },
      { status: 500 },
    );
  }
}
