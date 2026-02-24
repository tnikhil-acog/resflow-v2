"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { ProjectCombobox } from "@/components/project-combobox";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type ExportType =
  | "logs"
  | "reports"
  | "allocations"
  | "monthly-billing"
  | "employees"
  | "projects"
  | "audit-logs";
type ExportFormat = "csv" | "excel";

export default function ExportsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect if not HR
  if (user?.employee_role !== "hr_executive") {
    router.push("/tasks");
    return null;
  }

  const [exportType, setExportType] = useState<ExportType>("logs");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [allocationStatus, setAllocationStatus] = useState<"current" | "all">(
    "current",
  );
  const [employeeStatus, setEmployeeStatus] = useState<
    "active" | "exited" | "all"
  >("active");
  const [projectStatus, setProjectStatus] = useState<
    "active" | "completed" | "all"
  >("all");
  const [projectType, setProjectType] = useState<string>("ALL");
  const [auditAction, setAuditAction] = useState<string>("ALL");
  const [auditEntityType, setAuditEntityType] = useState<string>("ALL");
  const [isExporting, setIsExporting] = useState(false);

  // Get current date for defaults
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();

  const handleExport = async () => {
    setIsExporting(true);

    try {
      let url = "";
      const params = new URLSearchParams();
      params.append("format", format);

      switch (exportType) {
        case "logs":
          if (!startDate || !endDate) {
            toast({
              title: "Missing dates",
              description: "Please select start and end dates",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          url = `/api/exports/logs`;
          params.append("start_date", startDate);
          params.append("end_date", endDate);
          if (employeeId && employeeId !== "ALL")
            params.append("emp_id", employeeId);
          if (projectId && projectId !== "ALL")
            params.append("project_id", projectId);
          break;

        case "reports":
          if (!startDate || !endDate) {
            toast({
              title: "Missing dates",
              description: "Please select start and end dates",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          url = `/api/exports/reports`;
          params.append("start_date", startDate);
          params.append("end_date", endDate);
          if (employeeId && employeeId !== "ALL")
            params.append("emp_id", employeeId);
          break;

        case "allocations":
          url = `/api/exports/allocations`;
          params.append("status", allocationStatus);
          break;

        case "monthly-billing":
          url = `/api/exports/monthly-billing`;
          params.append("month", month || currentMonth.toString());
          params.append("year", year || currentYear.toString());
          break;

        case "employees":
          url = `/api/exports/employees`;
          params.append("status", employeeStatus);
          if (projectId && projectId !== "ALL")
            params.append("department_id", projectId);
          break;

        case "projects":
          url = `/api/exports/projects`;
          params.append("status", projectStatus);
          if (projectType && projectType !== "ALL")
            params.append("project_type", projectType);
          break;

        case "audit-logs":
          if (!startDate || !endDate) {
            toast({
              title: "Missing dates",
              description: "Please select start and end dates",
              variant: "destructive",
            });
            setIsExporting(false);
            return;
          }
          url = `/api/exports/audit-logs`;
          params.append("start_date", startDate);
          params.append("end_date", endDate);
          if (auditAction && auditAction !== "ALL")
            params.append("action", auditAction);
          if (auditEntityType && auditEntityType !== "ALL")
            params.append("entity_type", auditEntityType);
          break;
      }

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Export failed");
      }

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "export";
      if (contentDisposition) {
        const matches = /filename="([^"]*)"/.exec(contentDisposition);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Export successful",
        description: `Downloaded ${filename}`,
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error.message || "An error occurred during export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderFilters = () => {
    switch (exportType) {
      case "logs":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Employee (Optional)</Label>
              <EmployeeCombobox
                value={employeeId}
                onValueChange={setEmployeeId}
                showAllOption={true}
              />
            </div>
            <div className="space-y-2">
              <Label>Project (Optional)</Label>
              <ProjectCombobox
                value={projectId}
                onValueChange={setProjectId}
                showAllOption={true}
              />
            </div>
          </>
        );

      case "reports":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Employee (Optional)</Label>
              <EmployeeCombobox
                value={employeeId}
                onValueChange={setEmployeeId}
                showAllOption={true}
              />
            </div>
          </>
        );

      case "allocations":
        return (
          <div className="space-y-2">
            <Label>Allocation Status</Label>
            <Select
              value={allocationStatus}
              onValueChange={(value: "current" | "all") =>
                setAllocationStatus(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">
                  Current Allocations Only
                </SelectItem>
                <SelectItem value="all">
                  All Allocations (Including Past)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case "monthly-billing":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Month</Label>
              <Select
                value={month || currentMonth.toString()}
                onValueChange={setMonth}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {new Date(2024, m - 1).toLocaleString("default", {
                        month: "long",
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">Year</Label>
              <Select
                value={year || currentYear.toString()}
                onValueChange={setYear}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(
                    (y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "employees":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee Status</Label>
              <Select
                value={employeeStatus}
                onValueChange={(value: "active" | "exited" | "all") =>
                  setEmployeeStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Employees Only</SelectItem>
                  <SelectItem value="exited">Exited Employees Only</SelectItem>
                  <SelectItem value="all">All Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department (Optional)</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {/* Department options would be loaded dynamically */}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "projects":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Status</Label>
              <Select
                value={projectStatus}
                onValueChange={(value: "active" | "completed" | "all") =>
                  setProjectStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Projects</SelectItem>
                  <SelectItem value="completed">Completed Projects</SelectItem>
                  <SelectItem value="all">All Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Type (Optional)</Label>
              <Select value={projectType} onValueChange={setProjectType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="client">Client Projects</SelectItem>
                  <SelectItem value="internal">Internal Projects</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case "audit-logs":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Action Type (Optional)</Label>
              <Select value={auditAction} onValueChange={setAuditAction}>
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="LOGOUT">Logout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity Type (Optional)</Label>
              <Select
                value={auditEntityType}
                onValueChange={setAuditEntityType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Entities</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="allocation">Allocation</SelectItem>
                  <SelectItem value="log">Work Log</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Export</h1>
        <p className="text-muted-foreground">
          Export HR data to CSV or Excel format
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
          <CardDescription>
            Select the data type and configure export options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Export Type Selection */}
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select
              value={exportType}
              onValueChange={(value: ExportType) => {
                setExportType(value);
                // Reset filters when changing type
                setStartDate("");
                setEndDate("");
                setEmployeeId("");
                setProjectId("");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="logs">Daily Work Logs</SelectItem>
                <SelectItem value="reports">Weekly Reports</SelectItem>
                <SelectItem value="allocations">
                  Employee Allocations
                </SelectItem>
                <SelectItem value="monthly-billing">
                  Monthly Billing Summary
                </SelectItem>
                <SelectItem value="employees">Employees Master Data</SelectItem>
                <SelectItem value="projects">Projects Master Data</SelectItem>
                <SelectItem value="audit-logs">Audit Logs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <RadioGroup
              value={format}
              onValueChange={(value: ExportFormat) => setFormat(value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label
                  htmlFor="csv"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  CSV
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="excel" id="excel" />
                <Label
                  htmlFor="excel"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Dynamic Filters */}
          {renderFilters()}

          {/* Export Button */}
          <div className="pt-4">
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export Data"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Work Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export detailed work log entries including employee, project, hours,
            and billability information.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Reports</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export weekly timesheet reports with submission status and total
            hours.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Allocations</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export project allocations including role, allocation percentage,
            and billability status.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Billing Summary</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export monthly billing hours by project with client and project
            manager details.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employees Master Data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export complete employee database with personal and employment
            details.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projects Master Data</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export all projects with client details, PMs, and status
            information.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Export system audit trail with all user actions and data changes.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
