"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { LogFormFields } from "@/components/forms/log-form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

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

export default function NewLogPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<LogFormData>({
    project_id: undefined,
    log_date: new Date().toISOString().split("T")[0], // Default to today
    hours: "",
    notes: "",
  });

  useEffect(() => {
    fetchUserAllocations();
  }, []);

  async function fetchUserAllocations() {
    try {
      setFetchingProjects(true);

      // Fetch active allocations for the current user (API returns { allocations })
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/allocations?active_only=true", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }

      const data = await response.json();

      // Extract unique projects from allocations (response shape: { allocations: [...] })
      const projectsMap = new Map<string, Project>();
      (data.allocations || []).forEach((allocation: any) => {
        const pid = allocation.project_id || allocation.project?.id;
        const pcode =
          allocation.project_code || allocation.project?.project_code;
        const pname =
          allocation.project_name || allocation.project?.project_name;

        if (pid) {
          projectsMap.set(pid, {
            id: pid,
            project_code: pcode || "N/A",
            project_name: pname || "Unknown",
          });
        }
      });

      const projectsList = Array.from(projectsMap.values());
      setProjects(projectsList);

      if (projectsList.length === 0) {
        toast({
          title: "No Active Allocations",
          description:
            "You don't have any active project allocations. Please contact your manager to get assigned to a project before logging work hours.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching allocations:", error);
      toast({
        title: "Error",
        description: "Failed to fetch your project allocations.",
        variant: "destructive",
      });
    } finally {
      setFetchingProjects(false);
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

    if (!formData.project_id) {
      newErrors.project_id = "Please select a project";
    }

    if (!formData.log_date) {
      newErrors.log_date = "Please select a date";
    } else {
      const selectedDate = new Date(formData.log_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate > today) {
        newErrors.log_date = "Cannot log hours for future dates";
      }
    }

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
        project_id: formData.project_id,
        log_date: formData.log_date,
        hours: parseFloat(formData.hours),
        notes: formData.notes || null,
      };

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create log");
      }

      toast({
        title: "Success",
        description: "Work log created successfully.",
      });

      router.push("/logs");
    } catch (error: any) {
      console.error("Error creating log:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to create work log. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (fetchingProjects) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Daily Work Log</h1>
        <Link href="/logs">
          <Button variant="outline">Back to Logs</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <Alert>
          <InfoIcon className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold mb-2">No Active Allocations</p>
            <p>
              You don't have any active project allocations. You need to be
              assigned to a project before you can log work hours. Please
              contact your Project Manager or HR to get assigned to a project.
            </p>
            <div className="mt-4">
              <Link href="/allocations">
                <Button variant="outline" size="sm">
                  View My Allocations
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
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
                    Record your daily work hours for projects you're assigned
                    to. You can only select from projects where you have an
                    active allocation. Hours must be entered in decimal format
                    (e.g., 8.5 for 8 hours 30 minutes).
                  </p>
                </AlertDescription>
              </Alert>

              <LogFormFields
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                projects={projects}
                disabled={loading}
              />

              <div className="flex gap-3 justify-end">
                <Link href="/logs">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating...
                    </>
                  ) : (
                    "Create Log"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
