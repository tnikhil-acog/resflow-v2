"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  CalendarIcon,
  ClockIcon,
  FileText,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";

interface Employee {
  id: string;
  employee_name: string;
  employee_code: string;
}

interface Report {
  id: string;
  emp_id: string;
  report_type: "DAILY" | "WEEKLY";
  report_date: string | null;
  week_start_date: string | null;
  week_end_date: string | null;
  content: string;
  weekly_hours: any;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    employee_name: string;
    employee_code: string;
  };
}

interface PhaseReport {
  id: string;
  phase_id: string;
  content: string;
  submitted_by: string;
  submitted_at: string;
  phase_name: string;
  project_code: string;
  project_name: string;
  submitter_name: string;
}

export default function ReportsPage() {
  return (
    <ProtectedRoute
      requiredRoles={["employee", "project_manager", "hr_executive"]}
    >
      <ReportsContent />
    </ProtectedRoute>
  );
}

function ReportsContent() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<Report[]>([]);
  const [phaseReports, setPhaseReports] = useState<PhaseReport[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [viewMode, setViewMode] = useState<"WEEKLY" | "PHASE">("WEEKLY");

  const [employeeFilter, setEmployeeFilter] = useState<string>("");
  const [reportTypeFilter, setReportTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";
  // const canViewPhaseReports = isPM || isHR;

  const canViewPhaseReports = isPM || isHR;

  useEffect(() => {
    if (viewMode === "WEEKLY") {
      fetchReports();
    } else {
      fetchPhaseReports();
    }
  }, [viewMode, employeeFilter, reportTypeFilter, startDate, endDate]);

  useEffect(() => {
    if (isHR || isPM) {
      fetchEmployees();
    }
  }, [isHR, isPM]);

  async function fetchEmployees() {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        setEmployees(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
      setEmployees([]); // Set to empty array on error
    }
  }

  async function fetchReports() {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (employeeFilter && employeeFilter !== "ALL") {
        params.append("emp_id", employeeFilter);
      }
      if (reportTypeFilter && reportTypeFilter !== "ALL") {
        params.append("report_type", reportTypeFilter);
      }
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      setReports(data.reports || data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchPhaseReports() {
    try {
      setLoading(true);

      const token = localStorage.getItem("auth_token");
      const params = new URLSearchParams();

      // PM sees only their project's phase reports
      // HR sees all phase reports
      const response = await fetch(`/api/phase-reports?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch phase reports");
      }

      const data = await response.json();
      setPhaseReports(data.reports || data || []);
    } catch (error) {
      console.error("Error fetching phase reports:", error);
      toast({
        title: "Error",
        description: "Failed to fetch phase reports.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange() {
    fetchReports();
  }

  function handleClearFilters() {
    setEmployeeFilter("");
    setReportTypeFilter("");
    setStartDate("");
    setEndDate("");
    setTimeout(fetchReports, 100);
  }

  function getTotalHours(report: Report): number {
    if (!report.weekly_hours) return 0;

    try {
      const hours = report.weekly_hours as Record<string, number>;
      return Object.values(hours).reduce((sum, h) => sum + (Number(h) || 0), 0);
    } catch {
      return 0;
    }
  }

  function formatDateRange(report: Report): string {
    if (report.report_type === "DAILY" && report.report_date) {
      return format(new Date(report.report_date), "MMM dd, yyyy");
    }

    if (
      report.report_type === "WEEKLY" &&
      report.week_start_date &&
      report.week_end_date
    ) {
      return `${format(new Date(report.week_start_date), "MMM dd")} - ${format(new Date(report.week_end_date), "MMM dd, yyyy")}`;
    }

    return "N/A";
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reports</h1>
        <Link href="/reports/new">
          <Button>Submit New Report</Button>
        </Link>
      </div>

      {/* Advanced Reports - HR/PM Only */}
      {(isHR || isPM) && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
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
                      <h3 className="font-semibold text-lg">Monthly Reports</h3>
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Reports</CardTitle>
            {canViewPhaseReports && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "WEEKLY" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("WEEKLY")}
                >
                  <ClockIcon className="h-4 w-4 mr-2" />
                  Weekly Reports
                </Button>
                <Button
                  variant={viewMode === "PHASE" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("PHASE")}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Phase Reports
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {viewMode === "WEEKLY" && (isHR || isPM) && (
              <div className="space-y-2">
                <Label htmlFor="employee-filter">Employee</Label>
                <Select
                  value={employeeFilter}
                  onValueChange={setEmployeeFilter}
                >
                  <SelectTrigger id="employee-filter">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All employees</SelectItem>
                    {Array.isArray(employees) &&
                      employees.map((emp) => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employee_code} - {emp.employee_name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleFilterChange}>Apply Filters</Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {viewMode === "WEEKLY" ? "Weekly Reports" : "Phase Reports"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : viewMode === "WEEKLY" ? (
            reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No weekly reports found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card
                    key={report.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          {(isHR || isPM) && (
                            <div>
                              <div className="font-medium">
                                {report.employee.employee_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {report.employee.employee_code}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-4">
                            <Badge
                              variant={
                                report.report_type === "WEEKLY"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {report.report_type}
                            </Badge>

                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CalendarIcon className="h-4 w-4" />
                              {formatDateRange(report)}
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {getTotalHours(report).toFixed(2)} hrs
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Submitted on{" "}
                            {format(
                              new Date(report.created_at),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </div>
                        </div>

                        <Link href={`/reports/${report.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : phaseReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No phase reports found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {phaseReports.map((report) => (
                <Card
                  key={report.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 space-y-2">
                        <div>
                          <div className="font-medium">
                            {report.project_code} - {report.project_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Phase: {report.phase_name}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <Badge variant="default">
                            <FileText className="h-3 w-3 mr-1" />
                            Phase Report
                          </Badge>

                          <div className="text-sm text-muted-foreground">
                            By: {report.submitter_name}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            {format(
                              new Date(report.submitted_at),
                              "MMM dd, yyyy HH:mm",
                            )}
                          </div>
                        </div>

                        <div className="text-sm mt-2 line-clamp-2">
                          {report.content}
                        </div>
                      </div>

                      <Link href={`/reports/phase/${report.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
