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
import amplitude from "@/lib/amplitude";

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
  department_name?: string;
}

interface Department {
  id: string;
  department_name: string;
}

interface DemandFormData {
  project_id: string | undefined;
  role_required: string;
  skill_ids: string[];
  start_date: string;
  department_id: string | undefined;
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
  const { user, authenticatedFetch } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<DemandFormData>({
    project_id: undefined,
    role_required: "",
    skill_ids: [],
    start_date: "",
    department_id: undefined,
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";

  useEffect(() => {
    fetchProjects();
    fetchDepartments();
  }, []);

  // Fetch skills when department changes
  useEffect(() => {
    if (formData.department_id) {
      fetchSkills(formData.department_id);
    } else {
      setSkills([]);
    }
    // Clear selected skills when department changes
    setFormData((prev) => ({ ...prev, skill_ids: [] }));
  }, [formData.department_id]);

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();

      // PM can only see their managed projects
      if (isPM && user?.id) {
        params.append("project_manager_id", user.id);
        params.append("status", "ACTIVE");
      } else if (isHR) {
        params.append("status", "ACTIVE");
      }

      const response = await authenticatedFetch(`/api/projects?${params.toString()}`, {
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await authenticatedFetch("/api/departments", {
      });

      if (response.ok) {
        const data = await response.json();
        // Map API response to expected format
        const mappedDepartments = (data.departments || []).map((dept: any) => ({
          id: dept.id,
          department_name: dept.name,
        }));
        setDepartments(mappedDepartments);
      }
    } catch (error) {
      console.error("Error fetching departments:", error);
      toast.error("Failed to load departments");
    }
  };

  const fetchSkills = async (departmentId: string) => {
    try {
      const params = new URLSearchParams();
      params.append("department_id", departmentId);

      const response = await authenticatedFetch(`/api/skills?${params.toString()}`, {
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
      const response = await authenticatedFetch("/api/demands", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
      amplitude.track("demand_raised", { role_required: formData.role_required });
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
                  departments={departments}
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
