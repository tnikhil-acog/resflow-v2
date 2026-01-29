"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { LogFormFields } from "@/components/forms/log-form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon, AlertTriangleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
}

interface LogFormData {
  project_id: string | undefined;
  log_date: string;
  hours: string;
  notes: string;
}

interface LogDetail {
  id: string;
  emp_id: string;
  project_id: string;
  log_date: string;
  hours: string;
  notes: string | null;
  locked: boolean;
  created_at: string;
  project: {
    id: string;
    project_code: string;
    project_name: string;
  };
}

export default function LogDetailPage() {
  const router = useRouter();
  const params = useParams();
  const logId = params?.id as string;
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [logDetail, setLogDetail] = useState<LogDetail | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<LogFormData>({
    project_id: undefined,
    log_date: "",
    hours: "",
    notes: "",
  });

  useEffect(() => {
    if (logId) {
      fetchLogDetail();
    }
  }, [logId]);

  async function fetchLogDetail() {
    try {
      setFetching(true);
      const response = await fetch(`/api/logs/${logId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Log not found");
        }
        throw new Error("Failed to fetch log details");
      }

      const data: LogDetail = await response.json();
      setLogDetail(data);

      // Populate form
      setFormData({
        project_id: data.project_id,
        log_date: data.log_date.split("T")[0], // Format date
        hours: data.hours,
        notes: data.notes || "",
      });
    } catch (error: any) {
      console.error("Error fetching log:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch log details.",
        variant: "destructive",
      });

      // Redirect to logs list if log not found
      if (error.message === "Log not found") {
        setTimeout(() => router.push("/logs"), 2000);
      }
    } finally {
      setFetching(false);
    }
  }

  function handleFieldChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.hours || formData.hours === "") {
      newErrors.hours = "Please enter hours worked";
    } else {
      const hours = parseFloat(formData.hours);
      if (isNaN(hours) || hours <= 0) {
        newErrors.hours = "Hours must be a positive number";
      } else if (hours > 24) {
        newErrors.hours = "Hours cannot exceed 24 in a day";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (logDetail?.locked) {
      toast({
        title: "Cannot Edit",
        description: "This log is locked and cannot be modified.",
        variant: "destructive",
      });
      return;
    }

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
      const payload = {
        hours: parseFloat(formData.hours),
        notes: formData.notes || null,
      };

      const response = await fetch(`/api/logs/${logId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update log");
      }

      toast({
        title: "Success",
        description: "Work log updated successfully.",
      });

      router.push("/logs");
    } catch (error: any) {
      console.error("Error updating log:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to update work log. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!logDetail) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            Log not found. Redirecting to logs list...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">Edit Work Log</h1>
          {logDetail.locked && (
            <Badge
              variant="secondary"
              className="bg-yellow-100 text-yellow-800"
            >
              🔒 Locked
            </Badge>
          )}
        </div>
        <Link href="/logs">
          <Button variant="outline">Back to Logs</Button>
        </Link>
      </div>

      {logDetail.locked && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-1">This log is locked</p>
            <p>
              This work log has been included in a submitted weekly report and
              can no longer be modified. If you need to make changes, please
              contact your manager or HR.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Log Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert>
              <InfoIcon className="h-4 w-4" />
              <AlertDescription>
                <p className="text-sm">
                  You can update the hours worked and notes for this log entry.
                  The project and date cannot be changed after creation.
                </p>
              </AlertDescription>
            </Alert>

            <LogFormFields
              isEdit
              formData={formData}
              errors={errors}
              onChange={handleFieldChange}
              projects={logDetail.project ? [logDetail.project] : []}
              disabled={loading}
              locked={logDetail.locked}
            />

            <div className="flex gap-3 justify-end">
              <Link href="/logs">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={loading || logDetail.locked}>
                {loading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Updating...
                  </>
                ) : (
                  "Update Log"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
