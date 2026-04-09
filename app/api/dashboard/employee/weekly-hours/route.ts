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

    // Get daily hours breakdown
    const dailyHours = await db
      .select({
        log_date: schema.dailyProjectLogs.log_date,
        total_hours:
          sql<number>`COALESCE(SUM(${schema.dailyProjectLogs.hours}), 0)`.as(
            "total_hours",
          ),
        billable_hours: sql<number>`COALESCE(SUM(
          CASE 
            WHEN ${schema.projectAllocation.billability} = true 
            THEN ${schema.dailyProjectLogs.hours} 
            ELSE 0 
          END
        ), 0)`.as("billable_hours"),
      })
      .from(schema.dailyProjectLogs)
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
      .groupBy(schema.dailyProjectLogs.log_date)
      .orderBy(schema.dailyProjectLogs.log_date);

    // Calculate totals
    const totalHours = dailyHours.reduce(
      (sum, day) => sum + parseFloat(day.total_hours.toString()),
      0,
    );
    const billableHours = dailyHours.reduce(
      (sum, day) => sum + parseFloat(day.billable_hours.toString()),
      0,
    );

    // Generate all 7 days of the week with hours
    const byDay = [];
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const dayData = dailyHours.find((d) => d.log_date === dateStr);

      byDay.push({
        date: dateStr,
        day: dayNames[date.getDay()],
        hours: dayData ? parseFloat(dayData.total_hours.toString()) : 0,
      });
    }

    // Standard target is 40 hours per week (5 working days * 8 hours)
    const targetHours = 40;
    const percentage = Math.min((totalHours / targetHours) * 100, 100);

    return NextResponse.json({
      total_hours: totalHours,
      billable_hours: billableHours,
      non_billable_hours: totalHours - billableHours,
      target_hours: targetHours,
      percentage: Math.round(percentage),
      week_start: weekStart,
      week_end: weekEnd,
      by_day: byDay,
    });
  } catch (error) {
    console.error("Error fetching weekly hours:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly hours" },
      { status: 500 },
    );
  }
}
