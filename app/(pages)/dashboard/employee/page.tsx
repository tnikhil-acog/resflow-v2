"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProgressCard } from "@/components/dashboard/progress-card";
import { Clock, TrendingUp, ListChecks, Calendar } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";

interface WeeklyHours {
  total_hours: number;
  target_hours: number;
  percentage: number;
  billable_hours: number;
  non_billable_hours: number;
  by_day: Array<{
    date: string;
    day: string;
    hours: number;
  }>;
}

interface ProjectBreakdown {
  project_id: string;
  project_name: string;
  client_name: string;
  hours: number;
  billability: boolean;
  percentage: number;
}

interface DashboardData {
  weeklyHours: WeeklyHours;
  projects: ProjectBreakdown[];
  billabilityStatus: {
    billable_percentage: number;
    status: "high" | "medium" | "low";
  };
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function EmployeeDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const today = new Date();
      const weekStart = getMonday(today).toISOString().split("T")[0];

      const [hoursRes, projectsRes] = await Promise.all([
        fetch(`/api/dashboard/employee/weekly-hours?week_start=${weekStart}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `/api/dashboard/employee/project-breakdown?week_start=${weekStart}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      ]);

      const weeklyHours = await hoursRes.json();
      const projects = await projectsRes.json();

      // Calculate billability status
      const billablePercentage =
        weeklyHours.total_hours > 0
          ? Math.round(
              (weeklyHours.billable_hours / weeklyHours.total_hours) * 100,
            )
          : 0;

      const billabilityStatus: DashboardData["billabilityStatus"] = {
        billable_percentage: billablePercentage,
        status:
          billablePercentage >= 75
            ? "high"
            : billablePercentage >= 50
              ? "medium"
              : "low",
      };

      setData({
        weeklyHours,
        projects: projects.projects || [],
        billabilityStatus,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMonday = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const projectChartData =
    data?.projects.map((p) => ({
      name: p.project_name,
      value: p.hours,
      percentage: p.percentage,
    })) || [];

  const hoursPercentage = data
    ? Math.min(
        (data.weeklyHours.total_hours / data.weeklyHours.target_hours) * 100,
        100,
      )
    : 0;

  const getProgressColor = (): "success" | "warning" | "danger" | "default" => {
    if (hoursPercentage >= 100) return "success";
    if (hoursPercentage >= 75) return "warning";
    return "danger";
  };

  const getBillabilityColor = () => {
    const status = data?.billabilityStatus.status;
    if (status === "high") return "text-green-600";
    if (status === "medium") return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
          <h1 className="text-3xl font-semibold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your weekly performance and progress
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-8 py-8">
        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Weekly Hours"
            value={data?.weeklyHours.total_hours.toFixed(1) || "0.0"}
            description={`Target: ${data?.weeklyHours.target_hours || 40}h`}
            icon={Clock}
          />
          <StatsCard
            title="Billable Hours"
            value={data?.weeklyHours.billable_hours.toFixed(1) || "0.0"}
            description={`${data?.billabilityStatus.billable_percentage || 0}% billable`}
            icon={TrendingUp}
          />
          <StatsCard
            title="Active Projects"
            value={data?.projects.length || 0}
            description="This week"
            icon={ListChecks}
          />
          <StatsCard
            title="Days Logged"
            value={
              data?.weeklyHours.by_day.filter((d) => d.hours > 0).length || 0
            }
            description="Out of 5 working days"
            icon={Calendar}
          />
        </div>

        {/* Progress Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <ProgressCard
            title="Weekly Hours Progress"
            description="Current week target completion"
            value={data?.weeklyHours.total_hours || 0}
            max={data?.weeklyHours.target_hours || 40}
            color={getProgressColor()}
            showPercentage
          />
          <Card>
            <CardHeader>
              <CardTitle>Billability Status</CardTitle>
              <CardDescription>Your billable hours percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div
                    className={`text-4xl font-bold ${getBillabilityColor()}`}
                  >
                    {data?.billabilityStatus.billable_percentage || 0}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {data?.weeklyHours.billable_hours.toFixed(1) || "0.0"}h /{" "}
                    {data?.weeklyHours.total_hours.toFixed(1) || "0.0"}h
                  </div>
                </div>
                <Badge
                  variant={
                    data?.billabilityStatus.status === "high"
                      ? "default"
                      : data?.billabilityStatus.status === "medium"
                        ? "secondary"
                        : "destructive"
                  }
                >
                  {data?.billabilityStatus.status === "high"
                    ? "Excellent"
                    : data?.billabilityStatus.status === "medium"
                      ? "Good"
                      : "Needs Attention"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Daily Hours Breakdown</CardTitle>
            <CardDescription>Hours logged each day this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data?.weeklyHours.by_day.map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{day.day}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(day.date).toLocaleDateString("default", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {day.hours.toFixed(1)}h
                    </div>
                    {day.hours === 0 && (
                      <Badge variant="outline" className="text-xs">
                        Not Logged
                      </Badge>
                    )}
                    {day.hours > 0 && day.hours < 8 && (
                      <Badge variant="secondary" className="text-xs">
                        Partial
                      </Badge>
                    )}
                    {day.hours >= 8 && (
                      <Badge variant="default" className="text-xs">
                        Complete
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Project Breakdown Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Project Hours Breakdown</CardTitle>
            <CardDescription>
              Time distribution across projects this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projectChartData.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={projectChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percentage }) => `${percentage.toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {projectChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data?.projects.map((project, index) => (
                    <div
                      key={project.project_id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <div>
                          <div className="font-medium">
                            {project.project_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {project.client_name}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">
                          {project.hours.toFixed(1)}h
                        </div>
                        <Badge
                          variant={
                            project.billability ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {project.billability ? "Billable" : "Non-Billable"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No project data for this week
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
