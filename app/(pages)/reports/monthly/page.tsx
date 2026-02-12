"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Calendar,
  Download,
  AlertCircle,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { ProjectCombobox } from "@/components/project-combobox";

interface MonthlyRecord {
  emp_id: string;
  employee_code: string;
  full_name: string;
  project_id: string;
  project_code: string;
  project_name: string;
  total_hours: number;
  billability: boolean;
}

interface BillingProject {
  project_id: string;
  project_code: string;
  project_name: string;
  total_billable_hours: number;
  total_employees: number;
}

export default function MonthlyReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current date defaults
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    String(now.getMonth() + 1),
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    String(now.getFullYear()),
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>("ALL");
  const [selectedProject, setSelectedProject] = useState<string>("ALL");

  // Data
  const [consolidatedData, setConsolidatedData] = useState<MonthlyRecord[]>([]);
  const [billingData, setBillingData] = useState<{
    projects: BillingProject[];
    total_billable_hours: number;
  }>({ projects: [], total_billable_hours: 0 });

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

  useEffect(() => {
    if (authLoading || !user) return;
    fetchMonthlyData();
  }, [
    selectedMonth,
    selectedYear,
    selectedEmployee,
    selectedProject,
    authLoading,
    user,
  ]);

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("auth_token");
      if (!token) {
        router.push("/login");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Build query params
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      });

      if (selectedEmployee && selectedEmployee !== "ALL") {
        params.append("emp_id", selectedEmployee);
      }
      if (selectedProject && selectedProject !== "ALL") {
        params.append("project_id", selectedProject);
      }

      // Fetch both consolidated report and billing summary
      const [consolidatedRes, billingRes] = await Promise.all([
        fetch(`/api/reports/monthly?${params.toString()}`, { headers }),
        fetch(
          `/api/dashboard/billing/monthly?month=${selectedMonth}&year=${selectedYear}${selectedProject && selectedProject !== "ALL" ? `&project_id=${selectedProject}` : ""}`,
          { headers },
        ),
      ]);

      if (consolidatedRes.ok) {
        const data = await consolidatedRes.json();
        setConsolidatedData(data.records || []);
      }

      if (billingRes.ok) {
        const data = await billingRes.json();
        setBillingData({
          projects: data.projects || [],
          total_billable_hours: data.total_billable_hours || 0,
        });
      }
    } catch (err) {
      console.error("Error fetching monthly data:", err);
      setError("Failed to load monthly reports");
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (month: string) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[parseInt(month) - 1] || "";
  };

  const totalHours = consolidatedData.reduce(
    (sum, record) => sum + record.total_hours,
    0,
  );
  const billableRecords = consolidatedData.filter((r) => r.billability);
  const nonBillableRecords = consolidatedData.filter((r) => !r.billability);

  const uniqueEmployees = new Set(consolidatedData.map((r) => r.emp_id)).size;
  const uniqueProjects = new Set(consolidatedData.map((r) => r.project_id))
    .size;

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-[1800px] mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-8 shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10">
              <h1 className="text-3xl font-bold text-white mb-2">
                Monthly Reports
              </h1>
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="h-4 w-4" />
                <p className="text-sm font-medium">
                  {getMonthName(selectedMonth)} {selectedYear}
                </p>
              </div>
              <p className="text-white/80 mt-2 text-sm">
                Consolidated monthly billing and activity reports
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Month Filter */}
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <SelectItem key={m} value={String(m)}>
                        {getMonthName(String(m))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      { length: 5 },
                      (_, i) => now.getFullYear() - i,
                    ).map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Employee Filter */}
              <div className="space-y-2">
                <Label>Employee</Label>
                <EmployeeCombobox
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  placeholder="All employees..."
                  showAllOption={true}
                  filterByPMProjects={true}
                />
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label>Project</Label>
                <ProjectCombobox
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                  placeholder="All projects..."
                  showAllOption={true}
                />
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Hours
                      </p>
                      <p className="text-2xl font-bold">
                        {totalHours.toFixed(1)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Billable Hours
                      </p>
                      <p className="text-2xl font-bold">
                        {billingData.total_billable_hours.toFixed(1)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Employees</p>
                      <p className="text-2xl font-bold">{uniqueEmployees}</p>
                    </div>
                    <Users className="h-8 w-8 text-violet-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Projects</p>
                      <p className="text-2xl font-bold">{uniqueProjects}</p>
                    </div>
                    <FileText className="h-8 w-8 text-amber-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Billing Summary by Project */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Monthly Billing Summary</CardTitle>
                <CardDescription>
                  Billable hours by project for {getMonthName(selectedMonth)}{" "}
                  {selectedYear}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {billingData.projects.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No billable hours recorded for this period
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Project Code</TableHead>
                          <TableHead>Project Name</TableHead>
                          <TableHead className="text-right">
                            Billable Hours
                          </TableHead>
                          <TableHead className="text-right">
                            Employees
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {billingData.projects.map((project) => (
                          <TableRow key={project.project_id}>
                            <TableCell className="font-medium">
                              {project.project_code}
                            </TableCell>
                            <TableCell>{project.project_name}</TableCell>
                            <TableCell className="text-right">
                              {project.total_billable_hours.toFixed(1)}
                            </TableCell>
                            <TableCell className="text-right">
                              {project.total_employees}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={2}>Total</TableCell>
                          <TableCell className="text-right">
                            {billingData.total_billable_hours.toFixed(1)}
                          </TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Consolidated Report */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Consolidated Report</CardTitle>
                    <CardDescription>
                      Employee-wise hours breakdown by project
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {consolidatedData.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No data available for selected filters
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee Code</TableHead>
                          <TableHead>Employee Name</TableHead>
                          <TableHead>Project Code</TableHead>
                          <TableHead>Project Name</TableHead>
                          <TableHead className="text-right">Hours</TableHead>
                          <TableHead>Billability</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consolidatedData.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {record.employee_code}
                            </TableCell>
                            <TableCell>{record.full_name}</TableCell>
                            <TableCell>{record.project_code}</TableCell>
                            <TableCell>{record.project_name}</TableCell>
                            <TableCell className="text-right">
                              {record.total_hours.toFixed(1)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  record.billability ? "default" : "secondary"
                                }
                              >
                                {record.billability
                                  ? "Billable"
                                  : "Non-Billable"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
