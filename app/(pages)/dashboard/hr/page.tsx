"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProgressCard } from "@/components/dashboard/progress-card";
import {
  Users,
  Clock,
  CheckCircle,
  Briefcase,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";

interface DashboardData {
  userStatus: {
    active_users: number;
    inactive_users: number;
    total_users: number;
  };
  hoursComparison: {
    billable_hours: string;
    non_billable_hours: string;
    total_hours: string;
    billable_percentage: number;
  };
  timesheetCompletion: {
    total_employees: number;
    submitted: number;
    pending: number;
    completion_percentage: number;
  };
  projectClassification: {
    client_projects: number;
    internal_projects: number;
    total_active: number;
    client_percentage: number;
  };
  topProjects: Array<{
    project_code: string;
    project_name: string;
    total_billable_hours: string;
    total_employees: number;
  }>;
}

const COLORS = ["#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6"];

export default function HRDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  // Redirect if not HR
  if (user?.employee_role !== "hr_executive") {
    router.push("/analytics");
    return null;
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const today = new Date();
      const weekStart = getMonday(today).toISOString().split("T")[0];
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const [
        userStatusRes,
        hoursRes,
        timesheetRes,
        projectClassRes,
        topProjectsRes,
      ] = await Promise.all([
        fetch("/api/dashboard/users/status", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `/api/dashboard/hours/comparison?start_date=${monthStart}&end_date=${monthEnd}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
        fetch(
          `/api/dashboard/timesheets/completion?week_start_date=${weekStart}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
        fetch("/api/dashboard/projects/classification", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `/api/dashboard/billing/monthly?month=${today.getMonth() + 1}&year=${today.getFullYear()}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ),
      ]);

      const userStatus = await userStatusRes.json();
      const hoursComparison = await hoursRes.json();
      const timesheetCompletion = await timesheetRes.json();
      const projectClassification = await projectClassRes.json();
      const topProjectsData = await topProjectsRes.json();

      setData({
        userStatus,
        hoursComparison,
        timesheetCompletion,
        projectClassification,
        topProjects: topProjectsData.projects?.slice(0, 5) || [],
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

  const hoursChartData = data
    ? [
        {
          name: "Billable",
          hours: parseFloat(data.hoursComparison.billable_hours),
        },
        {
          name: "Non-Billable",
          hours: parseFloat(data.hoursComparison.non_billable_hours),
        },
      ]
    : [];

  const projectPieData = data
    ? [
        {
          name: "Client Projects",
          value: data.projectClassification.client_projects,
        },
        {
          name: "Internal Projects",
          value: data.projectClassification.internal_projects,
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
          <h1 className="text-3xl font-semibold">HR Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of workforce metrics and analytics
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-8 py-8">
        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Active Users"
            value={data?.userStatus.active_users || 0}
            description={`${data?.userStatus.inactive_users || 0} inactive`}
            icon={Users}
          />
          <StatsCard
            title="Total Hours (Month)"
            value={parseFloat(data?.hoursComparison.total_hours || "0").toFixed(
              1,
            )}
            description={`${data?.hoursComparison.billable_percentage || 0}% billable`}
            icon={Clock}
          />
          <StatsCard
            title="Active Projects"
            value={data?.projectClassification.total_active || 0}
            description={`${data?.projectClassification.client_projects || 0} client, ${data?.projectClassification.internal_projects || 0} internal`}
            icon={Briefcase}
          />
          <StatsCard
            title="Timesheet Completion"
            value={`${data?.timesheetCompletion.completion_percentage || 0}%`}
            description={`${data?.timesheetCompletion.pending || 0} pending`}
            icon={CheckCircle}
          />
        </div>

        {/* Progress Card */}
        <div className="mb-8">
          <ProgressCard
            title="Timesheet Submission Progress"
            description="This week's timesheet completion"
            value={data?.timesheetCompletion.submitted || 0}
            max={data?.timesheetCompletion.total_employees || 1}
            color={
              (data?.timesheetCompletion.completion_percentage || 0) >= 80
                ? "success"
                : (data?.timesheetCompletion.completion_percentage || 0) >= 50
                  ? "warning"
                  : "danger"
            }
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Billable vs Non-Billable Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Billable vs Non-Billable Hours</CardTitle>
              <CardDescription>Current month breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hoursChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="hours" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Classification Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Project Classification</CardTitle>
              <CardDescription>Client vs Internal projects</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={projectPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Projects by Billable Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Projects by Billable Hours</CardTitle>
            <CardDescription>Current month performance</CardDescription>
          </CardHeader>
          <CardContent>
            {data?.topProjects && data.topProjects.length > 0 ? (
              <div className="space-y-4">
                {data.topProjects.map((project, index) => (
                  <div
                    key={project.project_code}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">
                          {project.project_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {project.project_code}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-lg">
                        {parseFloat(project.total_billable_hours).toFixed(1)}h
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {project.total_employees}{" "}
                        {project.total_employees === 1
                          ? "employee"
                          : "employees"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No billable hours data for this month
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
