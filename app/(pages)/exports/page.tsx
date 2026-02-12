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

type ExportType = "logs" | "reports" | "allocations" | "monthly-billing";
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
      }

      const response = await fetch(`${url}?${params.toString()}`);

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
      <div className="grid gap-4 md:grid-cols-2">
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
      </div>
    </div>
  );
}
