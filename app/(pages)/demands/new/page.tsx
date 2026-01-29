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
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { DemandFormFields } from "@/components/forms/demand-form-fields";

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
  project_manager_id: string;
}

interface Skill {
  skill_id: string;
  skill_name: string;
  skill_department: string;
}

interface DemandFormData {
  project_id: string | undefined;
  role_required: string;
  skill_ids: string[];
  start_date: string;
}

interface FormErrors {
  [key: string]: string | undefined;
  project_id?: string;
  role_required?: string;
  skill_ids?: string;
  start_date?: string;
}

export default function CreateDemandPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <CreateDemandContent />
    </ProtectedRoute>
  );
}

function CreateDemandContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<DemandFormData>({
    project_id: undefined,
    role_required: "",
    skill_ids: [],
    start_date: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    fetchProjects();
    fetchSkills();
  }, []);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        let filteredProjects = data.projects || [];

        // PM can only see their managed projects, HR sees all
        if (isPM && user?.id) {
          filteredProjects = filteredProjects.filter(
            (p: Project) =>
              p.project_manager_id === user.id && p.status === "active",
          );
        } else if (isHR) {
          filteredProjects = filteredProjects.filter(
            (p: Project) => p.status === "active",
          );
        }

        setProjects(filteredProjects);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchSkills = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/skills", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSkills(data.skills || []);
      }
    } catch (error) {
      console.error("Error fetching skills:", error);
      toast.error("Failed to load skills");
    }
  };

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.project_id) {
      newErrors.project_id = "Project is required";
    }
    if (!formData.role_required || formData.role_required.trim().length === 0) {
      newErrors.role_required = "Role required is required";
    }
    if (!formData.start_date) {
      newErrors.start_date = "Start date is required";
    }
    if (formData.skill_ids.length === 0) {
      newErrors.skill_ids = "At least one skill must be selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/demands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "create",
          project_id: formData.project_id,
          role_required: formData.role_required,
          skill_ids: formData.skill_ids,
          start_date: formData.start_date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create demand");
      }

      toast.success("Demand created successfully");
      router.push("/demands");
    } catch (error) {
      console.error("Error creating demand:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create demand",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-semibold">Create Resource Demand</h1>
              <p className="text-muted-foreground mt-1">
                {isPM
                  ? "Request resources for your projects"
                  : "Create resource demand for any project"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Demand Details</CardTitle>
                <CardDescription>
                  Specify the project, role, skills, and start date for the
                  resource requirement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DemandFormFields
                  isEdit={false}
                  formData={formData}
                  errors={errors as Record<string, string>}
                  onChange={handleChange}
                  projects={projects}
                  skills={skills}
                  disabled={loading}
                />

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Demand"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}
