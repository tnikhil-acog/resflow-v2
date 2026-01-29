"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/components/status-badge";
import { LogWorkWidget } from "@/components/log-work-widget";
import {
  Briefcase,
  CheckSquare,
  Clock,
  AlertCircle,
  Users,
  FileText,
  Calendar,
  ArrowUpRight,
  UserPlus,
  FolderPlus,
  ListChecks,
  Settings,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface DashboardMetrics {
  role: string;
  metrics: {
    pendingTasks?: number;
    completedTasks?: number;
    activeProjects?: number;
    missingReports?: number;
    weeklyHours?: number;
    totalEmployees?: number;
    pendingDemands?: number;
    pendingApprovals?: number;
    teamMembers?: number;
    completedProjects?: number;
  };
  recentTasks?: any[];
  recentEmployees?: any[];
}

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const response = await fetch("/api/dashboard/metrics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();
        console.log("Dashboard data received:", result);

        // Map API response to dashboard data structure
        // API returns data directly, not wrapped in { data: {...} }
        setDashboardData({
          role: user?.employee_role || "employee",
          metrics: result.metrics || {
            pendingTasks: 0,
            completedTasks: 0,
            activeProjects: 0,
            missingReports: 0,
            weeklyHours: 0,
          },
          recentTasks: result.tasks || [], // API returns 'tasks' directly
          recentEmployees: [],
        });
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard",
        );
      } finally {
        setLoading(false);
      }
    };

    // Only fetch if we have a token
    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchDashboardData();
    } else {
      router.push("/login");
    }
  }, [router, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Always show dashboard, even with errors or no data
  const metrics = dashboardData?.metrics || {
    pendingTasks: 0,
    completedTasks: 0,
    activeProjects: 0,
    missingReports: 0,
    weeklyHours: 0,
    totalEmployees: 0,
    pendingDemands: 0,
    pendingApprovals: 0,
    teamMembers: 0,
    completedProjects: 0,
  };
  const recentTasks = dashboardData?.recentTasks || [];
  const recentEmployees = dashboardData?.recentEmployees || [];

  // Get role from user context or from dashboard data
  const userRole = user?.employee_role || dashboardData?.role || "employee";

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">
          {userRole === "employee" && "Employee Dashboard"}
          {userRole === "project_manager" && "Project Manager Dashboard"}
          {userRole === "hr_executive" && "HR Dashboard"}
        </h2>
      </div>

      {/* Error Alert (if any) */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Section */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Overview</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userRole === "employee" && (
            <>
              <Card className="border-t-4 border-t-red-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Tasks
                  </CardTitle>
                  <div className="p-2 bg-red-50 dark:bg-red-950 rounded">
                    <FileText className="h-5 w-5 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.pendingTasks || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed Tasks
                  </CardTitle>
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded">
                    <CheckSquare className="h-5 w-5 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.completedTasks || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Projects
                  </CardTitle>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded">
                    <Briefcase className="h-5 w-5 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.activeProjects || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Missing Reports
                  </CardTitle>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.missingReports || 0}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === "project_manager" && (
            <>
              <Card className="border-t-4 border-t-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Tasks
                  </CardTitle>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <CheckSquare className="h-5 w-5 text-blue-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.pendingTasks || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Active Projects
                  </CardTitle>
                  <div className="p-2 bg-orange-50 dark:bg-orange-950 rounded">
                    <Briefcase className="h-5 w-5 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.activeProjects || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Weekly Hours
                  </CardTitle>
                  <div className="p-2 bg-purple-50 dark:bg-purple-950 rounded">
                    <Clock className="h-5 w-5 text-purple-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.weeklyHours || 0}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-t-4 border-t-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Missing Reports
                  </CardTitle>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {metrics.missingReports || 0}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {userRole === "hr_executive" && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Tasks
                  </CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.pendingTasks || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Completed Tasks
                  </CardTitle>
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.completedTasks || 0}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid - Employee specific layout */}
      {userRole === "employee" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column - Time Tracking & Weekly Report */}
          <div className="space-y-6">
            {/* Daily Work Log */}
            <LogWorkWidget currentDate={currentTime} />

            {/* Submit Weekly Report */}
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <FileText className="h-5 w-5 mr-2" />
                <CardTitle className="text-base font-semibold">
                  Submit Weekly Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Submit a consolidated report of your work across all projects
                  this week
                </p>
                <Button variant="outline" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
                <p className="text-xs text-muted-foreground">
                  Last Submitted: January 6, 2026
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tasks */}
          <div>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary"
                  asChild
                >
                  <Link href="/tasks">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks available
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto,1fr,auto,auto] gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
                      <div className="w-6"></div>
                      <div>Task ↕</div>
                      <div>Project Name ↕</div>
                      <div>Deadline ↕</div>
                      <div>Status ↕</div>
                    </div>

                    {/* Table Rows */}
                    {recentTasks.slice(0, 6).map((task: any, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="grid grid-cols-[auto,1fr,auto,auto] gap-4 py-3 border-b last:border-0 items-center text-sm"
                      >
                        <Checkbox />
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-primary hover:underline"
                        >
                          {task.description || "No description"}
                        </Link>
                        <div className="text-muted-foreground">
                          {task.project_name || "N/A"}
                        </div>
                        <div className="text-muted-foreground">
                          {task.due_on
                            ? new Date(task.due_on).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "No date"}
                        </div>
                        <StatusBadge status={task.status || "DUE"} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* PM Dashboard Layout */}
      {userRole === "project_manager" && (
        <div className="grid gap-6 md:grid-cols-[1fr_350px]">
          {/* Left Column - Time Tracking, Weekly Report & Tasks */}
          <div className="space-y-6">
            {/* Daily Work Log */}
            <LogWorkWidget currentDate={currentTime} />

            {/* Submit Weekly Report */}
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <FileText className="h-5 w-5 mr-2" />
                <CardTitle className="text-base font-semibold">
                  Submit Weekly Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Submit a consolidated report of your work across all projects
                  this week
                </p>
                <Button variant="outline" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
                <p className="text-xs text-muted-foreground">
                  Last Submitted: January 6, 2026
                </p>
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary"
                  asChild
                >
                  <Link href="/tasks">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks available
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
                      <div className="w-6"></div>
                      <div>Task ↕</div>
                      <div>Project Name ↕</div>
                      <div>Deadline ↕</div>
                      <div>Status ↕</div>
                    </div>

                    {/* Table Rows */}
                    {recentTasks.slice(0, 6).map((task: any, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 py-3 border-b last:border-0 items-center text-sm"
                      >
                        <Checkbox />
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-primary hover:underline"
                        >
                          {task.description || "No description"}
                        </Link>
                        <div className="text-muted-foreground">
                          {task.project_name || "N/A"}
                        </div>
                        <div className="text-muted-foreground">
                          {task.due_on
                            ? new Date(task.due_on).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "No date"}
                        </div>
                        <StatusBadge status={task.status || "DUE"} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-auto flex items-start justify-start p-4 gap-3"
                    asChild
                  >
                    <Link href="/logs/new">
                      <Clock className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Log Work</div>
                        <div className="text-xs text-muted-foreground">
                          Track daily hours
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-auto flex items-start justify-start p-4 gap-3"
                    asChild
                  >
                    <Link href="/reports/new">
                      <FileText className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-medium">Submit Report</div>
                        <div className="text-xs text-muted-foreground">
                          Weekly summary
                        </div>
                      </div>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full h-auto flex items-start justify-start p-4 gap-3"
                    asChild
                  >
                    <Link href="/demands/new">
                      <Users className="h-5 w-5 mt-0.5" />
                      <div className="text-left">
                        <div className="text-sm font-medium">
                          Request Resource
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Create resource demand
                        </div>
                      </div>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* HR Dashboard Layout */}
      {userRole === "hr_executive" && (
        <div className="grid gap-6 md:grid-cols-[1fr_400px]">
          {/* Left Column - Date/Report & Tasks */}
          <div className="space-y-6">
            {/* Daily Work Log */}
            <LogWorkWidget currentDate={currentTime} />

            {/* Submit Weekly Report */}
            <Card>
              <CardHeader className="flex flex-row items-center space-y-0 pb-4">
                <FileText className="h-5 w-5 mr-2" />
                <CardTitle className="text-base font-semibold">
                  Submit Weekly Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Submit a consolidated report of your work across all projects
                  this week
                </p>
                <Button variant="outline" className="w-full">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Submit Report
                </Button>
                <p className="text-xs text-muted-foreground">
                  Last Submitted: January 6, 2026
                </p>
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tasks</CardTitle>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary"
                  asChild
                >
                  <Link href="/tasks">View All</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {recentTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tasks available
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Table Header */}
                    <div className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 pb-2 border-b text-xs font-medium text-muted-foreground">
                      <div className="w-6"></div>
                      <div>Task ↕</div>
                      <div>Project Name ↕</div>
                      <div>Deadline ↕</div>
                      <div>Status ↕</div>
                    </div>

                    {/* Table Rows */}
                    {recentTasks.slice(0, 5).map((task: any, idx: number) => (
                      <div
                        key={task.id || idx}
                        className="grid grid-cols-[auto,1fr,auto,auto,auto] gap-4 py-3 border-b last:border-0 items-center text-sm"
                      >
                        <Checkbox />
                        <Link
                          href={`/tasks/${task.id}`}
                          className="text-primary hover:underline"
                        >
                          {task.description || "No description"}
                        </Link>
                        <div className="text-muted-foreground">
                          {task.project_name || "N/A"}
                        </div>
                        <div className="text-muted-foreground">
                          {task.due_on
                            ? new Date(task.due_on).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )
                            : "No date"}
                        </div>
                        <StatusBadge status={task.status || "DUE"} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/demands">
                      <Users className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Request Resource
                      </span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/projects/new">
                      <FolderPlus className="h-5 w-5" />
                      <span className="text-sm font-medium">New Project</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/allocations/new">
                      <ListChecks className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Create Allocation
                      </span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/demands">
                      <Users className="h-5 w-5" />
                      <span className="text-sm font-medium">
                        Request Resource
                      </span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/employees/new">
                      <UserPlus className="h-5 w-5" />
                      <span className="text-sm font-medium">Add Employee</span>
                    </Link>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto flex-col items-start p-4 gap-2"
                    asChild
                  >
                    <Link href="/skills">
                      <Settings className="h-5 w-5" />
                      <span className="text-sm font-medium">Manage Skills</span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
