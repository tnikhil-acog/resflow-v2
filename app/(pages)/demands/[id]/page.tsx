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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Save, X, CheckCircle, XCircle } from "lucide-react";
import { DemandFormFields } from "@/components/forms/demand-form-fields";
import { LoadingPage } from "@/components/loading-spinner";

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

interface Demand {
  id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  role_required: string;
  skill_names: string[];
  skill_ids: string[];
  start_date: string;
  requested_by: string;
  requested_by_name: string;
  demand_status: string;
  created_at: string;
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

export default function DemandDetailPage() {
  return (
    <ProtectedRoute requiredRoles={["project_manager", "hr_executive"]}>
      <DemandDetailContent />
    </ProtectedRoute>
  );
}

function DemandDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const id = params?.id as string;

  const [demand, setDemand] = useState<Demand | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<DemandFormData>({
    project_id: undefined,
    role_required: "",
    skill_ids: [],
    start_date: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const isPM = user?.employee_role === "project_manager";
  const isHR = user?.employee_role === "hr_executive";
  const canEdit = demand?.demand_status === "REQUESTED" && (isPM || isHR);
  const canFulfillOrCancel = isHR;

  useEffect(() => {
    if (id) {
      fetchDemand();
      fetchProjects();
      fetchSkills();
    }
  }, [id]);

  const fetchDemand = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/demands?action=get&id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch demand");
      }

      const data = await response.json();
      setDemand(data.demand);
      setFormData({
        project_id: data.demand.project_id,
        role_required: data.demand.role_required,
        skill_ids: data.demand.skill_ids || [],
        start_date: data.demand.start_date,
      });
    } catch (error) {
      console.error("Error fetching demand:", error);
      toast.error("Failed to load demand");
      router.push("/demands");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/projects", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
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

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/demands", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update",
          id,
          role_required: formData.role_required,
          skill_ids: formData.skill_ids,
          start_date: formData.start_date,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update demand");
      }

      toast.success("Demand updated successfully");
      setIsEditing(false);
      fetchDemand();
    } catch (error) {
      console.error("Error updating demand:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update demand",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: "FULFILLED" | "CANCELLED") => {
    if (!isHR) {
      toast.error("Only HR can fulfill or cancel demands");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/demands", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update_status",
          id,
          demand_status: newStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Failed to ${newStatus.toLowerCase()} demand`,
        );
      }

      toast.success(`Demand ${newStatus.toLowerCase()} successfully`);
      fetchDemand();
    } catch (error) {
      console.error(`Error ${newStatus.toLowerCase()} demand:`, error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to ${newStatus.toLowerCase()} demand`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (demand) {
      setFormData({
        project_id: demand.project_id,
        role_required: demand.role_required,
        skill_ids: demand.skill_ids || [],
        start_date: demand.start_date,
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "REQUESTED":
        return "secondary";
      case "FULFILLED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "outline";
    }
  };

  if (loading) return <LoadingPage />;
  if (!demand) return <div>Demand not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold">Demand Details</h1>
              <p className="text-muted-foreground mt-1">
                {demand.project_name} - {demand.role_required}
              </p>
            </div>
            <div className="flex gap-2">
              {!isEditing && canEdit && (
                <Button onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Demand
                </Button>
              )}
              {canFulfillOrCancel &&
                demand.demand_status === "REQUESTED" &&
                !isEditing && (
                  <>
                    <Button
                      variant="default"
                      onClick={() => handleStatusChange("FULFILLED")}
                      disabled={saving}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Fulfill
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleStatusChange("CANCELLED")}
                      disabled={saving}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </>
                )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {!isEditing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Project & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Project
                      </div>
                      <div className="font-medium">
                        {demand.project_code} - {demand.project_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Status
                      </div>
                      <Badge
                        variant={getStatusBadgeVariant(demand.demand_status)}
                        className="mt-1"
                      >
                        {demand.demand_status}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Demand Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Role Required
                      </div>
                      <div className="font-medium mt-1">
                        {demand.role_required}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Start Date
                      </div>
                      <div className="font-medium mt-1">
                        {new Date(demand.start_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-muted-foreground mb-2">
                      Required Skills
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {demand.skill_names && demand.skill_names.length > 0 ? (
                        demand.skill_names.map((skill, idx) => (
                          <Badge key={idx} variant="secondary">
                            {skill}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">
                          No skills specified
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Request Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Requested By
                      </div>
                      <div className="font-medium mt-1">
                        {demand.requested_by_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Requested On
                      </div>
                      <div className="font-medium mt-1">
                        {new Date(demand.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Demand</CardTitle>
                <CardDescription>
                  Update demand details. Project cannot be changed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <DemandFormFields
                  isEdit={true}
                  formData={formData}
                  errors={errors as Record<string, string>}
                  onChange={handleChange}
                  projects={projects}
                  skills={skills}
                  disabled={saving}
                />

                <div className="flex justify-end gap-4 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
