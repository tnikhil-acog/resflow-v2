"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangleIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FileTextIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface Report {
  id: string;
  emp_id: string;
  report_type: "DAILY" | "WEEKLY";
  report_date: string | null;
  week_start_date: string | null;
  week_end_date: string | null;
  content: string;
  weekly_hours: Record<string, number> | null;
  created_at: string;
  updated_at: string;
  employee: {
    id: string;
    employee_name: string;
    employee_code: string;
  };
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const reportId = params?.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (reportId) {
      fetchUserRole();
      fetchReportDetail();
    }
  }, [reportId]);

  async function fetchUserRole() {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.user.role);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    }
  }

  async function fetchReportDetail() {
    try {
      setLoading(true);
      const response = await fetch(`/api/reports/${reportId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Report not found");
        }
        throw new Error("Failed to fetch report details");
      }

      const data: Report = await response.json();
      setReport(data);
    } catch (error: any) {
      console.error("Error fetching report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch report details.",
        variant: "destructive",
      });

      if (error.message === "Report not found") {
        setTimeout(() => router.push("/reports"), 2000);
      }
    } finally {
      setLoading(false);
    }
  }

  function formatPeriod(): string {
    if (!report) return "N/A";

    if (report.report_type === "DAILY" && report.report_date) {
      return format(new Date(report.report_date), "MMMM dd, yyyy");
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

  function getTotalHours(): number {
    if (!report?.weekly_hours) return 0;

    try {
      return Object.values(report.weekly_hours).reduce(
        (sum, hours) => sum + (Number(hours) || 0),
        0,
      );
    } catch {
      return 0;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            Report not found. Redirecting to reports list...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Report Details</h1>
          <Badge
            variant={report.report_type === "WEEKLY" ? "default" : "secondary"}
          >
            {report.report_type}
          </Badge>
        </div>
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Employee
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-semibold">
                  {report.employee.employee_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {report.employee.employee_code}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <div className="font-medium">{formatPeriod()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
              <div className="text-2xl font-bold">
                {getTotalHours().toFixed(2)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Submitted On
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium text-sm">
              {format(new Date(report.created_at), "MMM dd, yyyy")}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(report.created_at), "HH:mm")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileTextIcon className="h-5 w-5" />
            Report Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
              {report.content}
            </pre>
          </div>
        </CardContent>
      </Card>

      {report.report_type === "WEEKLY" && report.weekly_hours && (
        <Card>
          <CardHeader>
            <CardTitle>Hours Breakdown by Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Code</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(report.weekly_hours).map(
                  ([projectCode, hours]) => (
                    <TableRow key={projectCode}>
                      <TableCell className="font-medium">
                        {projectCode}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(hours).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ),
                )}
                <TableRow>
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">
                    {getTotalHours().toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 justify-end">
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
        <Link href="/logs">
          <Button variant="outline">View My Logs</Button>
        </Link>
      </div>
    </div>
  );
}
