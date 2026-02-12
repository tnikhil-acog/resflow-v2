"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { StatsCard } from "@/components/dashboard/stats-card";
import {
  Users,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "@/components/loading-spinner";
import Link from "next/link";

interface TeamMember {
  emp_id: string;
  employee_code: string;
  full_name: string;
  total_hours: string;
  billable_hours: string;
  non_billable_hours: string;
  billable_percentage: number;
  project_count: number;
  timesheet_status: string;
}

interface DashboardData {
  teamMembers: {
    team_members: TeamMember[];
    team_total_hours: string;
    team_billable_hours: string;
    team_billable_percentage: number;
  };
  productivity: {
    weekly_data: Array<{
      week_start: string;
      week_end: string;
      total_hours: number;
      billable_hours: number;
      employee_count: number;
    }>;
  };
  pendingApprovals: {
    skills: number;
    demands: number;
    total: number;
  };
}

export default function ManagerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Redirect if not PM
  if (user?.employee_role !== "project_manager") {
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

      // Get 8 weeks ago for productivity trend
      const eightWeeksAgo = new Date(today);
      eightWeeksAgo.setDate(today.getDate() - 56);
      const trendStart = getMonday(eightWeeksAgo).toISOString().split("T")[0];
      const trendEnd = today.toISOString().split("T")[0];

      const [teamRes, productivityRes, skillsRes, demandsRes] =
        await Promise.all([
          fetch(`/api/dashboard/team/members?week_start=${weekStart}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `/api/dashboard/team/productivity?start_date=${trendStart}&end_date=${trendEnd}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
          fetch("/api/approvals?type=skill", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/approvals?type=demand", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const teamMembers = await teamRes.json();
      const productivity = await productivityRes.json();
      const skills = await skillsRes.json();
      const demands = await demandsRes.json();

      setData({
        teamMembers,
        productivity,
        pendingApprovals: {
          skills: skills.approvals?.length || 0,
          demands: demands.approvals?.length || 0,
          total:
            (skills.approvals?.length || 0) + (demands.approvals?.length || 0),
        },
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

  const toggleRow = (empId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) {
        newSet.delete(empId);
      } else {
        newSet.add(empId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const productivityChartData =
    data?.productivity.weekly_data.map((week) => ({
      week: new Date(week.week_start).toLocaleDateString("default", {
        month: "short",
        day: "numeric",
      }),
      total: week.total_hours,
      billable: week.billable_hours,
    })) || [];

  const avgBillablePercentage = data?.teamMembers.team_billable_percentage || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-6 md:px-8 py-6">
          <h1 className="text-3xl font-semibold">Manager Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Team performance and metrics overview
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 md:px-8 py-8">
        {/* Stats Cards Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatsCard
            title="Team Size"
            value={data?.teamMembers.team_members.length || 0}
            description="Active team members"
            icon={Users}
          />
          <StatsCard
            title="Team Hours (Week)"
            value={parseFloat(
              data?.teamMembers.team_total_hours || "0",
            ).toFixed(1)}
            description="Total hours logged"
            icon={Clock}
          />
          <StatsCard
            title="Team Billability"
            value={`${avgBillablePercentage}%`}
            description="Average billable percentage"
            icon={TrendingUp}
          />
          <StatsCard
            title="Pending Approvals"
            value={data?.pendingApprovals.total || 0}
            description={`${data?.pendingApprovals.skills || 0} skills, ${data?.pendingApprovals.demands || 0} demands`}
            icon={AlertCircle}
          />
        </div>

        {/* Quick Actions */}
        {data && data.pendingApprovals.total > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button asChild>
                  <Link href="/approvals?type=skill">
                    Review Skill Requests ({data.pendingApprovals.skills})
                  </Link>
                </Button>
                {data.pendingApprovals.demands > 0 && (
                  <Button asChild variant="outline">
                    <Link href="/approvals?type=demand">
                      Review Demands ({data.pendingApprovals.demands})
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Productivity Trend Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Team Productivity Trend</CardTitle>
            <CardDescription>Last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={productivityChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3b82f6"
                  name="Total Hours"
                />
                <Line
                  type="monotone"
                  dataKey="billable"
                  stroke="#10b981"
                  name="Billable Hours"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Members Details */}
        <Card>
          <CardHeader>
            <CardTitle>Team Members - This Week</CardTitle>
            <CardDescription>
              Individual breakdown of hours and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data?.teamMembers.team_members &&
            data.teamMembers.team_members.length > 0 ? (
              <div className="space-y-2">
                {data.teamMembers.team_members.map((member) => (
                  <div
                    key={member.emp_id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div>
                          <div className="font-medium">{member.full_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {member.employee_code}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Hours
                          </div>
                          <div className="font-semibold">
                            {parseFloat(member.total_hours).toFixed(1)}h
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Billable
                          </div>
                          <Badge
                            variant={
                              member.billable_percentage >= 75
                                ? "default"
                                : "secondary"
                            }
                          >
                            {member.billable_percentage}%
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Projects
                          </div>
                          <div className="font-medium">
                            {member.project_count}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">
                            Status
                          </div>
                          <Badge
                            variant={
                              member.timesheet_status === "submitted"
                                ? "default"
                                : "outline"
                            }
                          >
                            {member.timesheet_status === "submitted"
                              ? "Submitted"
                              : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No team member data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
