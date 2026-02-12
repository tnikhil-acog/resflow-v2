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
  Plus,
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

  // Redirect to role-specific dashboard
  useEffect(() => {
    if (user) {
      if (user.employee_role === "hr_executive") {
        router.push("/dashboard/hr");
      } else if (user.employee_role === "project_manager") {
        router.push("/dashboard/manager");
      } else {
        router.push("/dashboard/employee");
      }
    }
  }, [user, router]);
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
            router.push("/login");
            return;
          }
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();
        console.log("Dashboard data received:", result);

        setDashboardData({
          role: user?.employee_role || "employee",
          metrics: result.metrics || {
            pendingTasks: 0,
            completedTasks: 0,
            activeProjects: 0,
            missingReports: 0,
            weeklyHours: 0,
          },
          recentTasks: result.tasks || [],
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

    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchDashboardData();
    } else {
      router.push("/login");
    }
  }, [router, authLoading, user?.employee_role]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

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
  const userRole = user?.employee_role || dashboardData?.role || "employee";

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1600px] mx-auto p-6 min-w-0">
        {/* Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Welcome & Metrics */}
          <div className="xl:col-span-4 space-y-6">
            {/* Welcome Section */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

              <div className="relative z-10 flex flex-col gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    Welcome back, {user?.full_name?.split(" ")[0] || "User"}
                  </h1>
                  <div className="flex items-center gap-2 text-white/90">
                    <Calendar className="h-4 w-4" />
                    <p className="text-sm font-medium">
                      {formatDate(currentTime)} •{" "}
                      {currentTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Overview */}
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold">Overview</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Your key metrics at a glance
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {userRole === "employee" && (
                  <>
                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-rose-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Pending Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-rose-500/10 p-2.5 ring-2 ring-rose-500/20">
                          <FileText className="h-5 w-5 text-rose-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.pendingTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Requires attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Completed Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-2 ring-emerald-500/20">
                          <CheckSquare className="h-5 w-5 text-emerald-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.completedTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Successfully done
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-blue-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Active Projects
                        </CardTitle>
                        <div className="rounded-xl bg-blue-500/10 p-2.5 ring-2 ring-blue-500/20">
                          <Briefcase className="h-5 w-5 text-blue-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.activeProjects || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Currently working on
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-violet-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Weekly Hours
                        </CardTitle>
                        <div className="rounded-xl bg-violet-500/10 p-2.5 ring-2 ring-violet-500/20">
                          <Clock className="h-5 w-5 text-violet-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.weeklyHours || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Hours logged
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}

                {userRole === "project_manager" && (
                  <>
                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Pending Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-primary/10 p-2.5 ring-2 ring-primary/20">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.pendingTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Requires attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Completed Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-2 ring-emerald-500/20">
                          <CheckSquare className="h-5 w-5 text-emerald-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.completedTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Successfully done
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-amber-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Active Projects
                        </CardTitle>
                        <div className="rounded-xl bg-amber-500/10 p-2.5 ring-2 ring-amber-500/20">
                          <Briefcase className="h-5 w-5 text-amber-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.activeProjects || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Currently working on
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-violet-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Weekly Hours
                        </CardTitle>
                        <div className="rounded-xl bg-violet-500/10 p-2.5 ring-2 ring-violet-500/20">
                          <Clock className="h-5 w-5 text-violet-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.weeklyHours || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Hours logged
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}

                {userRole === "hr_executive" && (
                  <>
                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-primary/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Pending Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-primary/10 p-2.5 ring-2 ring-primary/20">
                          <CheckSquare className="h-5 w-5 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.pendingTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Requires attention
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="group relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all bg-gradient-to-br from-card to-card/50">
                      <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/10" />
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Completed Tasks
                        </CardTitle>
                        <div className="rounded-xl bg-emerald-500/10 p-2.5 ring-2 ring-emerald-500/20">
                          <CheckSquare className="h-5 w-5 text-emerald-500" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground mb-1">
                          {metrics.completedTasks || 0}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">
                          Successfully done
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Main Content */}
          <div className="xl:col-span-8">
            {userRole === "employee" && (
              <div className="space-y-6">
                {/* Daily Work Log */}
                <Card
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden group"
                  onClick={() => router.push("/logs/new")}
                >
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Log Daily Work
                        </CardTitle>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Record your daily work hours across multiple projects
                    </p>
                    <Button
                      className="w-full shadow-md hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/logs/new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Log
                    </Button>
                  </CardContent>
                </Card>

                {/* Submit Weekly Report */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center ring-2 ring-violet-500/10">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Submit Weekly Report
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Submit a consolidated report of your work across all
                      projects this week
                    </p>
                    <Button
                      variant="outline"
                      className="w-full shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => router.push("/reports/new")}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Last Submitted: January 6, 2026
                    </p>
                  </CardContent>
                </Card>

                {/* Tasks */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-500/10">
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Tasks
                        </CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/tasks">View All</Link>
                      </Button>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6">
                    {recentTasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTasks
                          .slice(0, 6)
                          .map((task: any, idx: number) => (
                            <div
                              key={task.id || idx}
                              className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                            >
                              <Checkbox className="mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-2">
                                <Link
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-semibold text-primary hover:underline line-clamp-2 group-hover:text-primary/90 transition-colors"
                                >
                                  {task.description || "No description"}
                                </Link>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {task.due_on
                                      ? new Date(
                                          task.due_on,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })
                                      : "No date"}
                                  </div>
                                </div>
                              </div>
                              <StatusBadge status={task.status || "DUE"} />
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {userRole === "project_manager" && (
              <div className="space-y-6">
                {/* Daily Work Log */}
                <Card
                  className="hover:shadow-xl transition-shadow cursor-pointer border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden group"
                  onClick={() => router.push("/logs/new")}
                >
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Log Daily Work
                        </CardTitle>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Record your daily work hours across multiple projects
                    </p>
                    <Button
                      className="w-full shadow-md hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/logs/new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Log
                    </Button>
                  </CardContent>
                </Card>

                {/* Submit Weekly Report */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center ring-2 ring-violet-500/10">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Submit Weekly Report
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Submit a consolidated report of your work across all
                      projects this week
                    </p>
                    <Button
                      variant="outline"
                      className="w-full shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => router.push("/reports/new")}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Last Submitted: January 6, 2026
                    </p>
                  </CardContent>
                </Card>

                {/* Tasks Section */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-500/10">
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Tasks
                        </CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/tasks">View All</Link>
                      </Button>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6">
                    {recentTasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTasks
                          .slice(0, 6)
                          .map((task: any, idx: number) => (
                            <div
                              key={task.id || idx}
                              className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                            >
                              <Checkbox className="mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-2">
                                <Link
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-semibold text-primary hover:underline line-clamp-2 group-hover:text-primary/90 transition-colors"
                                >
                                  {task.description || "No description"}
                                </Link>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {task.due_on
                                      ? new Date(
                                          task.due_on,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })
                                      : "No date"}
                                  </div>
                                </div>
                              </div>
                              <StatusBadge status={task.status || "DUE"} />
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 border-b">
                    <CardHeader className="p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center ring-2 ring-amber-500/10">
                          <Settings className="h-5 w-5 text-amber-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Quick Actions
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/logs/new">
                          <Clock className="h-4 w-4 mr-2" />
                          Log Work
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/reports/new">
                          <FileText className="h-4 w-4 mr-2" />
                          Submit Report
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/demands/new">
                          <Users className="h-4 w-4 mr-2" />
                          Request Resource
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {userRole === "hr_executive" && (
              <div className="space-y-6">
                {/* Daily Work Log */}
                <Card
                  className="hover:shadow-xl transition-shadow cursor-pointer border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden group"
                  onClick={() => router.push("/logs/new")}
                >
                  <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center ring-2 ring-primary/10">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Log Daily Work
                        </CardTitle>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Record your daily work hours across multiple projects
                    </p>
                    <Button
                      className="w-full shadow-md hover:shadow-lg transition-shadow"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push("/logs/new");
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Work Log
                    </Button>
                  </CardContent>
                </Card>

                {/* Submit Weekly Report */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-violet-500/10 via-violet-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-4 p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center ring-2 ring-violet-500/10">
                          <FileText className="h-5 w-5 text-violet-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Submit Weekly Report
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Submit a consolidated report of your work across all
                      projects this week
                    </p>
                    <Button
                      variant="outline"
                      className="w-full shadow-sm hover:shadow-md transition-shadow"
                      onClick={() => router.push("/reports/new")}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Submit Report
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Last Submitted: January 6, 2026
                    </p>
                  </CardContent>
                </Card>

                {/* Tasks Section */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-5 border-b">
                    <CardHeader className="flex flex-row items-center justify-between p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center ring-2 ring-emerald-500/10">
                          <CheckSquare className="h-5 w-5 text-emerald-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Tasks
                        </CardTitle>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/tasks">View All</Link>
                      </Button>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6">
                    {recentTasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No tasks available
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recentTasks
                          .slice(0, 5)
                          .map((task: any, idx: number) => (
                            <div
                              key={task.id || idx}
                              className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/50 transition-colors group"
                            >
                              <Checkbox className="mt-0.5" />
                              <div className="flex-1 min-w-0 space-y-2">
                                <Link
                                  href={`/tasks/${task.id}`}
                                  className="text-sm font-semibold text-primary hover:underline line-clamp-2 group-hover:text-primary/90 transition-colors"
                                >
                                  {task.description || "No description"}
                                </Link>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {task.due_on
                                      ? new Date(
                                          task.due_on,
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                        })
                                      : "No date"}
                                  </div>
                                </div>
                              </div>
                              <StatusBadge status={task.status || "DUE"} />
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-none shadow-lg bg-gradient-to-br from-card to-card/50 overflow-hidden">
                  <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent p-5 border-b">
                    <CardHeader className="p-0">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-rose-500/20 flex items-center justify-center ring-2 ring-rose-500/10">
                          <Settings className="h-5 w-5 text-rose-600" />
                        </div>
                        <CardTitle className="text-xl font-bold">
                          Quick Actions
                        </CardTitle>
                      </div>
                    </CardHeader>
                  </div>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start p-4 gap-2 shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/demands">
                          <Users className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            Request Resource
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start p-4 gap-2 shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/projects/new">
                          <FolderPlus className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            New Project
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start p-4 gap-2 shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/allocations/new">
                          <ListChecks className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            Create Allocation
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start p-4 gap-2 shadow-sm hover:shadow-md transition-shadow"
                        asChild
                      >
                        <Link href="/employees/new">
                          <UserPlus className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            Add Employee
                          </span>
                        </Link>
                      </Button>

                      <Button
                        variant="outline"
                        className="h-auto flex-col items-start p-4 gap-2 shadow-sm hover:shadow-md transition-shadow col-span-2"
                        asChild
                      >
                        <Link href="/skills">
                          <Settings className="h-5 w-5" />
                          <span className="text-sm font-semibold">
                            Manage Skills
                          </span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
