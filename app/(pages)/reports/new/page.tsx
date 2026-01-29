"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, CalendarIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { addDays, startOfWeek, endOfWeek, format } from "date-fns";

interface ProjectHours {
  project_code: string;
  project_name: string;
  total_hours: number;
}

interface FormData {
  report_type: "DAILY" | "WEEKLY";
  report_date: string;
  week_start_date: string;
  week_end_date: string;
  content: string;
}

export default function NewReportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingHours, setFetchingHours] = useState(false);
  const [projectHours, setProjectHours] = useState<ProjectHours[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<FormData>({
    report_type: "WEEKLY",
    report_date: new Date().toISOString().split("T")[0],
    week_start_date: format(
      startOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    ),
    week_end_date: format(
      endOfWeek(new Date(), { weekStartsOn: 1 }),
      "yyyy-MM-dd",
    ),
    content: "",
  });

  useEffect(() => {
    if (formData.report_type === "WEEKLY") {
      fetchWeeklyHours();
    }
  }, [formData.week_start_date, formData.week_end_date]);

  async function fetchWeeklyHours() {
    if (!formData.week_start_date || !formData.week_end_date) return;

    try {
      setFetchingHours(true);
      const response = await fetch(
        `/api/logs?start_date=${formData.week_start_date}&end_date=${formData.week_end_date}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch logs");
      }

      const logs = await response.json();

      // Aggregate hours by project
      const hoursMap = new Map<string, ProjectHours>();

      logs.forEach((log: any) => {
        const projectKey = log.project?.id || "unknown";
        const existing = hoursMap.get(projectKey);

        if (existing) {
          existing.total_hours += parseFloat(log.hours || 0);
        } else {
          hoursMap.set(projectKey, {
            project_code: log.project?.project_code || "N/A",
            project_name: log.project?.project_name || "Unknown",
            total_hours: parseFloat(log.hours || 0),
          });
        }
      });

      setProjectHours(Array.from(hoursMap.values()));
    } catch (error) {
      console.error("Error fetching weekly hours:", error);
      toast({
        title: "Error",
        description: "Failed to fetch weekly hours summary.",
        variant: "destructive",
      });
    } finally {
      setFetchingHours(false);
    }
  }

  function handleReportTypeChange(value: string) {
    setFormData((prev) => ({
      ...prev,
      report_type: value as "DAILY" | "WEEKLY",
    }));
  }

  function handleWeekChange(startDate: string) {
    const start = new Date(startDate);
    const weekStart = startOfWeek(start, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(start, { weekStartsOn: 1 });

    setFormData((prev) => ({
      ...prev,
      week_start_date: format(weekStart, "yyyy-MM-dd"),
      week_end_date: format(weekEnd, "yyyy-MM-dd"),
    }));
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.content || formData.content.trim() === "") {
      newErrors.content = "Report content is required";
    }

    if (formData.report_type === "DAILY" && !formData.report_date) {
      newErrors.report_date = "Report date is required for daily reports";
    }

    if (formData.report_type === "WEEKLY") {
      if (!formData.week_start_date) {
        newErrors.week_start_date = "Week start date is required";
      }
      if (!formData.week_end_date) {
        newErrors.week_end_date = "Week end date is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Prepare weekly_hours JSONB
      const weeklyHoursJson: Record<string, number> = {};
      projectHours.forEach((ph) => {
        weeklyHoursJson[ph.project_code] = ph.total_hours;
      });

      const payload = {
        report_type: formData.report_type,
        report_date:
          formData.report_type === "DAILY" ? formData.report_date : null,
        week_start_date:
          formData.report_type === "WEEKLY" ? formData.week_start_date : null,
        week_end_date:
          formData.report_type === "WEEKLY" ? formData.week_end_date : null,
        content: formData.content,
        weekly_hours:
          formData.report_type === "WEEKLY" ? weeklyHoursJson : null,
      };

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create report");
      }

      toast({
        title: "Success",
        description: "Report submitted successfully.",
      });

      router.push("/reports");
    } catch (error: any) {
      console.error("Error creating report:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const totalHours = projectHours.reduce((sum, ph) => sum + ph.total_hours, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Submit Report</h1>
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>

      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertDescription>
          <p className="text-sm">
            Submit your weekly work report summarizing tasks completed,
            challenges faced, and hours worked. For weekly reports, your logged
            hours will be automatically aggregated by project.
          </p>
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="report_type">
                  Report Type <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.report_type}
                  onValueChange={handleReportTypeChange}
                  disabled={loading}
                >
                  <SelectTrigger id="report_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily Report</SelectItem>
                    <SelectItem value="WEEKLY">Weekly Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.report_type === "DAILY" ? (
                <div className="space-y-2">
                  <Label htmlFor="report_date">
                    Report Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="report_date"
                    type="date"
                    value={formData.report_date}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        report_date: e.target.value,
                      }))
                    }
                    disabled={loading}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {errors.report_date && (
                    <p className="text-sm text-destructive">
                      {errors.report_date}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="week_start_date">
                    Week Starting <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="week_start_date"
                    type="date"
                    value={formData.week_start_date}
                    onChange={(e) => handleWeekChange(e.target.value)}
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground">
                    Week: {format(new Date(formData.week_start_date), "MMM dd")}{" "}
                    - {format(new Date(formData.week_end_date), "MMM dd, yyyy")}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Report Content <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, content: e.target.value }))
                }
                disabled={loading}
                placeholder="Summarize your work this week, key accomplishments, challenges faced, and any blockers..."
                rows={8}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content}</p>
              )}
              <p className="text-xs text-muted-foreground">
                You can use markdown formatting for better readability
              </p>
            </div>
          </CardContent>
        </Card>

        {formData.report_type === "WEEKLY" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Weekly Hours Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {fetchingHours ? (
                <div className="flex items-center justify-center py-8">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : projectHours.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    <p className="text-sm">
                      No logged hours found for the selected week. Make sure you
                      have logged your daily work hours before submitting a
                      weekly report.
                    </p>
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Project</TableHead>
                        <TableHead className="text-right">Hours</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectHours.map((ph, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {ph.project_code}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {ph.project_name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {ph.total_hours.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-bold">Total</TableCell>
                        <TableCell className="text-right font-bold">
                          {totalHours.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-xs text-muted-foreground mt-2">
                    Hours are automatically calculated from your daily work logs
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3 justify-end">
          <Link href="/reports">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Submitting...
              </>
            ) : (
              "Submit Report"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
