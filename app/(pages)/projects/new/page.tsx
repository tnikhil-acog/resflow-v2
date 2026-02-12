"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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
  short_description?: string;
  long_description?: string;
  pitch_deck_url?: string;
  github_url?: string;
  started_on: string;
}

export default function NewProjectPage() {
  return (
    <ProtectedRoute requiredRoles={["hr_executive"]}>
      <NewProjectContent />
    </ProtectedRoute>
  );
}

function NewProjectContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ProjectFormData>({
    project_code: "",
    project_name: "",
    client_id: undefined,
    project_manager_id: undefined,
    short_description: "",
    long_description: "",
    pitch_deck_url: "",
    github_url: "",
    started_on: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.employee_role !== "hr_executive") {
      toast.error("Access denied: HR Executive only");
      router.push("/projects");
    }
  }, [user, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("auth_token");

      // Fetch clients
      const clientsResponse = await fetch("/api/clients", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (clientsResponse.ok) {
        const clientsData = await clientsResponse.json();
        setClients(clientsData.clients || []);
      }

      // Fetch project managers - use role filter and high limit
      // Note: Database enum uses "PM" not "project_manager"
      const empResponse = await fetch(
        "/api/employees?role=PM&limit=999&status=ACTIVE",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (empResponse.ok) {
        const empData = await empResponse.json();
        console.log("Employees API response:", empData);
        const managersList = (empData.employees || []).map((emp: any) => ({
          id: emp.id,
          full_name: emp.full_name || "",
        }));
        console.log("Project Managers list:", managersList);
        setManagers(managersList);
      } else {
        console.error("Failed to fetch employees:", empResponse.status);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
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

    if (!formData.project_code.trim()) {
      newErrors.project_code = "Project code is required";
    }

    if (!formData.project_name.trim()) {
      newErrors.project_name = "Project name is required";
    }

    if (!formData.project_manager_id) {
      newErrors.project_manager_id = "Project manager is required";
    }

    if (!formData.started_on) {
      newErrors.started_on = "Start date is required";
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

      // Extract project type from first letter of project code (in uppercase)
      const projectType = formData.project_code.trim().charAt(0).toUpperCase();
      console.log("Project Code:", formData.project_code.trim());
      console.log("Extracted Project Type:", projectType);

      const payload: any = {
        project_code: formData.project_code.trim(),
        project_name: formData.project_name.trim(),
        project_type: projectType,
        project_manager_id: formData.project_manager_id,
        started_on: formData.started_on,
      };

      // Add client_id only if provided
      if (formData.client_id) {
        payload.client_id = formData.client_id;
      }

      // Add optional fields
      if (formData.short_description)
        payload.short_description = formData.short_description.trim();
      if (formData.long_description)
        payload.long_description = formData.long_description.trim();
      if (formData.pitch_deck_url)
        payload.pitch_deck_url = formData.pitch_deck_url.trim();
      if (formData.github_url) payload.github_url = formData.github_url.trim();

      console.log("Create Project Payload:", payload);

      const response = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create project");
      }

      toast.success(`Project ${formData.project_name} created successfully`);
      router.push(`/projects/${result.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create project";
      toast.error(errorMessage);

      if (errorMessage.includes("project_code")) {
        setErrors((prev) => ({
          ...prev,
          project_code: "Project code already exists",
        }));
      }
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
            onClick={() => router.push("/projects")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
          <h1 className="text-3xl font-semibold">Create New Project</h1>
          <p className="text-muted-foreground mt-1">
            Add a new project to the system
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Project Information</CardTitle>
            <CardDescription>
              Enter the details for the new project. Fields marked with * are
              required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <ProjectFormFields
                isEdit={false}
                formData={formData}
                errors={errors}
                onChange={handleFieldChange}
                clients={clients}
                managers={managers}
                disabled={submitting}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/projects")}
                  disabled={submitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Create Project
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
