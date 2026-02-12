"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { LoadingSpinner } from "@/components/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  CheckSquare,
  Clock,
  AlertCircle,
  Users,
  FileText,
  Calendar,
  TrendingUp,
  DollarSign,
  FolderOpen,
  Building2,
  PieChart,
  Filter,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { ProjectCombobox } from "@/components/project-combobox";

interface AnalyticsData {
  billableHours?: {
    billable_hours: number;
    non_billable_hours: number;
    total_hours: number;
    period: { start: string; end: string };
  };
  projectClassification?: {
    client_projects: number;
    internal_projects: number;
    total_active: number;
  };
  employeeBillability?: {
    billable_percentage: number;
    non_billable_percentage: number;
    total_allocation: number;
    allocations: Array<{
      project_code: string;
      project_name: string;
      allocation_percentage: number;
      billability: boolean;
    }>;
  };
  dashboardMetrics?: {
    pendingTasks?: number;
    completedTasks?: number;
    activeProjects?: number;
    missingReports?: number;
    weeklyHours?: number;
    totalEmployees?: number;
    pendingApprovals?: number;
    teamMembers?: number;
  };
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});
  const [currentTime, setCurrentTime] = useState(new Date());

  // Filters
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [selectedProject, setSelectedProject] = useState<string>("ALL");
  const [selectedEmpType, setSelectedEmpType] = useState<string>("ALL");

  // Filter options
  const [departments, setDepartments] = useState<any[]>([]);

  // Check access - only HR and PM allowed
  useEffect(() => {
    if (authLoading) return;

    if (
      !user ||
      (user.employee_role !== "hr_executive" &&
        user.employee_role !== "project_manager")
    ) {
      router.push("/tasks");
      return;
    }
  }, [user, authLoading, router]);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load filter options
  useEffect(() => {
    if (authLoading || !user) return;

    const loadFilterOptions = async () => {
      try {
        const token = localStorage.getItem("auth_token");
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        // Fetch departments
        const deptRes = await fetch("/api/departments", { headers });
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(
            Array.isArray(deptData.departments) ? deptData.departments : [],
          );
        }

        // Note: Employees and Projects will use combobox components
        // which handle their own data fetching with PM filtering
      } catch (error) {
        console.error("Error loading filter options:", error);
      }
    };

    loadFilterOptions();
  }, [user, authLoading]);

  useEffect(() => {
    if (authLoading) return;

    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("auth_token");
        if (!token) {
          router.push("/login");
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // Build filter params
        const filterParams = new URLSearchParams();
        if (selectedDepartment && selectedDepartment !== "ALL") {
          filterParams.append("department_id", selectedDepartment);
        }
        if (selectedEmployee && selectedEmployee !== "ALL") {
          filterParams.append("emp_id", selectedEmployee);
        }
        if (selectedProject && selectedProject !== "ALL") {
          filterParams.append("project_id", selectedProject);
        }
        if (selectedEmpType && selectedEmpType !== "ALL") {
          filterParams.append("emp_type", selectedEmpType);
        }

        const filterQuery = filterParams.toString()
          ? `?${filterParams.toString()}`
          : "";

        // Fetch all analytics data in parallel
        const promises: Promise<any>[] = [
          // Always fetch dashboard metrics
          fetch("/api/dashboard/metrics", { headers }).then((r) =>
            r.ok ? r.json() : null,
          ),
          // Fetch billable hours with filters
          fetch(`/api/dashboard/hours/billable${filterQuery}`, {
            headers,
          }).then((r) => (r.ok ? r.json() : null)),
        ];

        // Add role-specific endpoints
        if (
          user?.employee_role === "hr_executive" ||
          user?.employee_role === "project_manager"
        ) {
          promises.push(
            fetch("/api/dashboard/projects/classification", { headers }).then(
              (r) => (r.ok ? r.json() : null),
            ),
          );
        }

        // Fetch employee billability for all users
        if (user?.id) {
          promises.push(
            fetch(`/api/employees/${user.id}/billability`, { headers }).then(
              (r) => (r.ok ? r.json() : null),
            ),
          );
        }

        const [
          dashboardMetricsData,
          billableHoursData,
          projectClassificationData,
          employeeBillabilityData,
        ] = await Promise.all(promises);

        setAnalyticsData({
          dashboardMetrics: dashboardMetricsData?.metrics || {},
          billableHours: billableHoursData || null,
          projectClassification: projectClassificationData || null,
          employeeBillability: employeeBillabilityData || null,
        });
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load analytics",
        );
      } finally {
        setLoading(false);
      }
    };

    const token = localStorage.getItem("auth_token");
    if (token) {
      fetchAnalyticsData();
    } else {
      router.push("/login");
    }
  }, [
    router,
    authLoading,
    user?.employee_role,
    user?.id,
    selectedDepartment,
    selectedEmployee,
    selectedProject,
    selectedEmpType,
  ]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const userRole = user?.employee_role || "employee";
  const metrics = analyticsData.dashboardMetrics || {};
  const billableData = analyticsData.billableHours;
  const projectData = analyticsData.projectClassification;
  const billabilityData = analyticsData.employeeBillability;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const calculateBillablePercentage = () => {
    if (!billableData || billableData.total_hours === 0) return 0;
    return Math.round(
      (billableData.billable_hours / billableData.total_hours) * 100,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-2">
                Analytics Dashboard
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
              <p className="text-white/80 mt-2 text-sm">
                Welcome back, {user?.full_name?.split(" ")[0] || "User"} •{" "}
                {userRole === "hr_executive"
                  ? "HR Executive"
                  : userRole === "project_manager"
                    ? "Project Manager"
                    : "Employee"}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Department Filter */}
              <div className="space-y-2">
                <Label htmlFor="department-filter">Department</Label>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger id="department-filter">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Departments</SelectItem>
                    {departments.map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label htmlFor="employee-filter">Employee</Label>
                <EmployeeCombobox
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="Select employee..."
                  showAllOption={true}
                  filterByPMProjects={true}
                />
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label htmlFor="project-filter">Project</Label>
                <ProjectCombobox
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  placeholder="Select project..."
                  showAllOption={true}
                />
              </div>

              {/* Employee Type Filter */}
              <div className="space-y-2">
                <Label htmlFor="emptype-filter">Employee Type</Label>
                <Select
                  value={selectedEmpType}
                  onValueChange={setSelectedEmpType}
                >
                  <SelectTrigger id="emptype-filter">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="FTE">FTE</SelectItem>
                    <SelectItem value="INTERN">INTERN</SelectItem>
                    <SelectItem value="Trainee">Trainee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Phase 1: Core Metrics & Billability Tracking */}
        <div className="space-y-8">
          {/* Billable Hours Section */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Billable Hours Tracking
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Billable Hours */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Billable Hours
                    </CardTitle>
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {billableData?.billable_hours?.toFixed(1) || "0.0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This week
                  </p>
                </CardContent>
              </Card>

              {/* Non-Billable Hours */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Non-Billable Hours
                    </CardTitle>
                    <div className="rounded-lg bg-orange-500/10 p-2">
                      <Clock className="h-4 w-4 text-orange-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {billableData?.non_billable_hours?.toFixed(1) || "0.0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This week
                  </p>
                </CardContent>
              </Card>

              {/* Total Hours */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Hours
                    </CardTitle>
                    <div className="rounded-lg bg-blue-500/10 p-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {billableData?.total_hours?.toFixed(1) || "0.0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This week
                  </p>
                </CardContent>
              </Card>

              {/* Billability Percentage */}
              <Card className="border-none shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Billability Rate
                    </CardTitle>
                    <div className="rounded-lg bg-purple-500/10 p-2">
                      <PieChart className="h-4 w-4 text-purple-500" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600">
                    {calculateBillablePercentage()}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Of total hours
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Project Classification - HR/PM Only */}
          {(userRole === "hr_executive" || userRole === "project_manager") &&
            projectData && (
              <div>
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" />
                  Project Classification
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Client Projects
                        </CardTitle>
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">
                        {projectData.client_projects}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active client projects
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Internal Projects
                        </CardTitle>
                        <div className="rounded-lg bg-violet-500/10 p-2">
                          <FolderOpen className="h-4 w-4 text-violet-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-violet-600">
                        {projectData.internal_projects}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Internal/support projects
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Active
                        </CardTitle>
                        <div className="rounded-lg bg-green-500/10 p-2">
                          <CheckSquare className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {projectData.total_active}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        All active projects
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

          {/* Employee Billability Breakdown */}
          {billabilityData && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Your Allocation Breakdown
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Billability Summary Cards */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Billable Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {billabilityData.billable_percentage}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Of current allocation
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Non-Billable Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {billabilityData.non_billable_percentage}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Of current allocation
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Allocation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {billabilityData.total_allocation}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current workload
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Project Allocations Table */}
              {billabilityData.allocations &&
                billabilityData.allocations.length > 0 && (
                  <Card className="mt-6 border-none shadow-lg">
                    <CardHeader>
                      <CardTitle>Current Project Allocations</CardTitle>
                      <CardDescription>
                        Your active project assignments with billability status
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                                Project Code
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-sm text-muted-foreground">
                                Project Name
                              </th>
                              <th className="text-right py-3 px-4 font-medium text-sm text-muted-foreground">
                                Allocation %
                              </th>
                              <th className="text-center py-3 px-4 font-medium text-sm text-muted-foreground">
                                Billability
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {billabilityData.allocations.map(
                              (allocation, index) => (
                                <tr
                                  key={index}
                                  className="border-b last:border-0"
                                >
                                  <td className="py-3 px-4 font-mono text-sm">
                                    {allocation.project_code}
                                  </td>
                                  <td className="py-3 px-4 text-sm">
                                    {allocation.project_name}
                                  </td>
                                  <td className="py-3 px-4 text-right font-semibold text-sm">
                                    {allocation.allocation_percentage}%
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {allocation.billability ? (
                                      <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20 border-green-200">
                                        Billable
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-orange-500/10 text-orange-700 hover:bg-orange-500/20 border-orange-200">
                                        Non-Billable
                                      </Badge>
                                    )}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}

          {/* Standard Dashboard Metrics */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              General Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {userRole === "employee" && (
                <>
                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Pending Tasks
                        </CardTitle>
                        <div className="rounded-lg bg-rose-500/10 p-2">
                          <FileText className="h-4 w-4 text-rose-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.pendingTasks || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires attention
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Completed Tasks
                        </CardTitle>
                        <div className="rounded-lg bg-emerald-500/10 p-2">
                          <CheckSquare className="h-4 w-4 text-emerald-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.completedTasks || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Successfully done
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Active Projects
                        </CardTitle>
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.activeProjects || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Currently working on
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Weekly Hours
                        </CardTitle>
                        <div className="rounded-lg bg-violet-500/10 p-2">
                          <Clock className="h-4 w-4 text-violet-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.weeklyHours || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hours logged
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}

              {(userRole === "hr_executive" ||
                userRole === "project_manager") && (
                <>
                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {userRole === "hr_executive"
                            ? "Total Employees"
                            : "Team Members"}
                        </CardTitle>
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {userRole === "hr_executive"
                          ? metrics.totalEmployees || 0
                          : metrics.teamMembers || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active users
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Pending Approvals
                        </CardTitle>
                        <div className="rounded-lg bg-orange-500/10 p-2">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.pendingApprovals || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires action
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Active Projects
                        </CardTitle>
                        <div className="rounded-lg bg-blue-500/10 p-2">
                          <Briefcase className="h-4 w-4 text-blue-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.activeProjects || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        In progress
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-lg">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Pending Tasks
                        </CardTitle>
                        <div className="rounded-lg bg-rose-500/10 p-2">
                          <FileText className="h-4 w-4 text-rose-500" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {metrics.pendingTasks || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Requires attention
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/logs">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                >
                  <Clock className="h-6 w-6" />
                  <span>View Work Logs</span>
                </Button>
              </Link>
              <Link href="/reports">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                >
                  <FileText className="h-6 w-6" />
                  <span>View Reports</span>
                </Button>
              </Link>
              <Link href="/projects">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col items-center gap-2"
                >
                  <Briefcase className="h-6 w-6" />
                  <span>View Projects</span>
                </Button>
              </Link>
              {userRole !== "employee" && (
                <Link href="/employees">
                  <Button
                    variant="outline"
                    className="w-full h-auto py-4 flex flex-col items-center gap-2"
                  >
                    <Users className="h-6 w-6" />
                    <span>View Employees</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Phase 2 Quick Links - HR/PM Only */}
          {(userRole === "hr_executive" || userRole === "project_manager") && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                Advanced Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/reports/monthly">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <Calendar className="h-8 w-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            Monthly Reports
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Consolidated monthly billing and activity reports
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
                <Link href="/reports/productivity">
                  <Card className="border-none shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-emerald-500/10 p-3">
                          <TrendingUp className="h-8 w-8 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">
                            Team Productivity
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Weekly team performance and hours tracking
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
