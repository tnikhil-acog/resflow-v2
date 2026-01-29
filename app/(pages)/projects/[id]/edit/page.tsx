"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProjectFormFields } from "@/components/forms/project-form-fields";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LoadingPage, LoadingSpinner } from "@/components/loading-spinner";

interface Client {
  id: string;
  client_name: string;
}

interface Manager {
  id: string;
  full_name: string;
}

interface ProjectFormData {
  project_code: string;
  project_name: string;
  client_id: string | undefined;
  project_manager_id: string | undefined;
  short_description: string;
  long_description: string;
  pitch_deck_url: string;
  github_url: string;
  status: string | undefined;
  started_on: string;
}

export default function EditProjectPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <EditProjectContent />
    </ProtectedRoute>
  );
}

function EditProjectContent() {
  const params = useParams();
  const projectId = params.id as string;
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [allowedStatusTransitions, setAllowedStatusTransitions] = useState<
    string[]
  >([]);

  const [formData, setFormData] = useState<ProjectFormData>({
    project_code: "",
    project_name: "",
    client_id: undefined,
    project_manager_id: undefined,
    short_description: "",
    long_description: "",
    pitch_deck_url: "",
    github_url: "",
    status: undefined,
    started_on: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const isHR = user?.employee_role === "hr_executive";
  const isPM = user?.employee_role === "project_manager";

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch project details
      const projectResponse = await fetch(
        `/api/projects?action=get&id=${projectId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!projectResponse.ok) {
        if (projectResponse.status === 403) {
          toast.error("You don't have permission to edit this project");
          router.push("/projects");
          return;
        }
        throw new Error("Failed to fetch project details");
      }

      const projectData = await projectResponse.json();

      setFormData({
        project_code: projectData.project_code || "",
        project_name: projectData.project_name || "",
        client_id: projectData.client_id || undefined,
        project_manager_id: projectData.project_manager_id || undefined,
        short_description: projectData.short_description || "",
        long_description: projectData.long_description || "",
        pitch_deck_url: projectData.pitch_deck_url || "",
        github_url: projectData.github_url || "",
        status: projectData.status || undefined,
        started_on: projectData.started_on
          ? new Date(projectData.started_on).toISOString().split("T")[0]
          : "",
      });

      // Fetch allowed status transitions
      const transitionsResponse = await fetch(
        `/api/projects/status-transitions?current_status=${projectData.status}&role=${user?.employee_role}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (transitionsResponse.ok) {
        const transitionsData = await transitionsResponse.json();
        setAllowedStatusTransitions(transitionsData.allowed_transitions || []);
      }

      // Fetch clients (only for HR)
      if (isHR) {
        const clientsResponse = await fetch("/api/clients", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (clientsResponse.ok) {
          const clientsData = await clientsResponse.json();
          setClients(clientsData.clients || []);
        }

        // Fetch project managers
        const managersResponse = await fetch("/api/employees", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (managersResponse.ok) {
          const managersData = await managersResponse.json();
          const managersList = (managersData.employees || []).filter(
            (emp: any) => emp.employee_role === "project_manager",
          );
          setManagers(managersList);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load project details");
      router.push("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // PM can only edit description and status
    if (isPM) {
      // No required field validation for PM
    } else if (isHR) {
      if (!formData.project_name.trim()) {
        newErrors.project_name = "Project name is required";
      }

      if (!formData.client_id) {
        newErrors.client_id = "Client is required";
      }

      if (!formData.project_manager_id) {
        newErrors.project_manager_id = "Project manager is required";
      }

      if (!formData.started_on) {
        newErrors.started_on = "Start date is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("auth_token");

      // Build payload based on role
      const payload: any = {
        id: projectId,
        short_description: formData.short_description.trim(),
        long_description: formData.long_description.trim(),
        pitch_deck_url: formData.pitch_deck_url.trim(),
        github_url: formData.github_url.trim(),
        status: formData.status,
      };

      // HR can update additional fields
      if (isHR) {
        payload.project_name = formData.project_name.trim();
        payload.client_id = formData.client_id;
        payload.project_manager_id = formData.project_manager_id;
        payload.started_on = formData.started_on;
      }

      const response = await fetch("/api/projects", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update project");
      }

      toast.success(`Project ${formData.project_name} updated successfully`);
      router.push(`/projects/${projectId}`);
    } catch (error) {
      console.error("Error updating project:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update project",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Project Details
          </Button>
          <h1 className="text-3xl font-semibold">Edit Project</h1>
          <p className="text-muted-foreground mt-1">
            Update project information
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isPM && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              As a Project Manager, you can only edit descriptions, links, and
              project status. Contact HR to modify project name, client, or
              project manager.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Update the details for {formData.project_name}
              {!isHR && ". Project code cannot be changed."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <ProjectFormFields
                isEdit={true}
                isPM={isPM}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                clients={clients}
                managers={managers}
                disabled={submitting}
                allowedStatuses={allowedStatusTransitions}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/projects/${projectId}`)}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Update Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
