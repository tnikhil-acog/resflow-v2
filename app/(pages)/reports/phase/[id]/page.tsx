"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import { ArrowLeft, FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";

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

function PhaseReportDetail() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [report, setReport] = useState<PhaseReport | null>(null);
  const [loading, setLoading] = useState(true);

  const id = params.id as string;

  useEffect(() => {
    if (id) {
      fetchPhaseReport();
    }
  }, [id]);

  async function fetchPhaseReport() {
    try {
      setLoading(true);
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/phase-reports/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch phase report");
      }

      const data = await response.json();
      setReport(data);
    } catch (error: any) {
      console.error("Error fetching phase report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load phase report",
        variant: "destructive",
      });
      router.push("/reports");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Phase report not found</p>
        <Link href="/reports">
          <Button variant="outline">Back to Reports</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/reports">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="default">
                <FileText className="h-3 w-3 mr-1" />
                Phase Report
              </Badge>
            </div>
            <h1 className="text-3xl font-bold">
              {report.project_code} - {report.project_name}
            </h1>
            <p className="text-lg text-muted-foreground mt-2">
              Phase: {report.phase_name}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Submitted By
              </p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{report.submitter_name}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Submitted On
              </p>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">
                  {format(new Date(report.submitted_at), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Report Content</h2>
            <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
              {report.content}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PhaseReportPage() {
  return (
    <ProtectedRoute
      requiredRoles={["employee", "project_manager", "hr_executive"]}
    >
      <PhaseReportDetail />
    </ProtectedRoute>
  );
}
