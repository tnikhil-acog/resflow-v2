"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import { AllocationFormFields } from "@/components/forms/allocation-form-fields";
import { LoadingPage } from "@/components/loading-spinner";

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  designation: string;
}

interface Project {
  id: string;
  project_code: string;
  project_name: string;
  status: string;
}

interface Allocation {
  id: string;
  emp_id: string;
  employee_code: string;
  employee_name: string;
  project_id: string;
  project_code: string;
  project_name: string;
  allocation_percentage: number;
  role: string;
  is_billable: boolean;
  start_date: string;
  end_date?: string;
}

interface AllocationFormData {
  employee_id: string | undefined;
  project_id: string | undefined;
  allocation_percentage: string;
  role: string;
  start_date: string;
  end_date: string;
  is_billable: boolean;
}

interface FormErrors {
  [key: string]: string | undefined;
  employee_id?: string;
  project_id?: string;
  allocation_percentage?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
}

export default function AllocationDetailPage() {
  return (
    <ProtectedRoute>
      <AllocationDetailContent />
    </ProtectedRoute>
  );
}

function AllocationDetailContent() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [allocation, setAllocation] = useState<Allocation | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [remainingCapacity, setRemainingCapacity] = useState<number | null>(
    null,
  );
  const [showCapacityWarning, setShowCapacityWarning] = useState(false);

  const [formData, setFormData] = useState<AllocationFormData>({
    employee_id: undefined,
    project_id: undefined,
    allocation_percentage: "",
    role: "",
    start_date: "",
    end_date: "",
    is_billable: false,
    // removed is_critical_resource
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (id) {
      fetchAllocation();
      fetchEmployees();
      fetchProjects();
    }
  }, [id]);

  useEffect(() => {
    if (isEditing && formData.employee_id) {
      fetchRemainingCapacity();
    }
  }, [isEditing, formData.employee_id]);

  useEffect(() => {
    const percentage = parseFloat(formData.allocation_percentage);
    if (remainingCapacity !== null && percentage > 0) {
      setShowCapacityWarning(percentage > remainingCapacity);
    } else {
      setShowCapacityWarning(false);
    }
  }, [remainingCapacity, formData.allocation_percentage]);

  const fetchAllocation = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/allocations?action=get&id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch allocation");
      }

      const data = await response.json();
      setAllocation(data.allocation);
      setFormData({
        employee_id: data.allocation.emp_id,
        project_id: data.allocation.project_id,
        allocation_percentage: data.allocation.allocation_percentage.toString(),
        role: data.allocation.role,
        start_date: data.allocation.start_date,
        end_date: data.allocation.end_date || "",
        is_billable: data.allocation.is_billable,
      });
    } catch (error) {
      console.error("Error fetching allocation:", error);
      toast.error("Failed to load allocation");
      router.push("/allocations");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
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

  const fetchRemainingCapacity = async () => {
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(
        `/api/allocations?action=capacity&employee_id=${formData.employee_id}&exclude_allocation_id=${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        setRemainingCapacity(data.remaining_capacity || 0);
      }
    } catch (error) {
      console.error("Error fetching capacity:", error);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    const percentage = parseFloat(formData.allocation_percentage);
    if (!formData.allocation_percentage || percentage <= 0) {
      newErrors.allocation_percentage =
        "Allocation percentage must be greater than 0";
    } else if (percentage > 100) {
      newErrors.allocation_percentage =
        "Allocation percentage cannot exceed 100%";
    }
    if (!formData.role || formData.role.trim().length === 0) {
      newErrors.role = "Role is required";
    }
    if (!formData.start_date) newErrors.start_date = "Start date is required";
    if (formData.end_date && formData.start_date) {
      if (new Date(formData.end_date) <= new Date(formData.start_date)) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Please fix the form errors");
      return;
    }

    const percentage = parseFloat(formData.allocation_percentage);
    if (remainingCapacity !== null && percentage > remainingCapacity) {
      toast.error(
        `Employee capacity exceeded. Available: ${remainingCapacity}%, Requested: ${percentage}%`,
      );
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/allocations", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "update",
          id,
          allocation_percentage: percentage,
          role: formData.role,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          is_billable: formData.is_billable,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update allocation");
      }

      toast.success("Allocation updated successfully");
      setIsEditing(false);
      fetchAllocation();
    } catch (error) {
      console.error("Error updating allocation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update allocation",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (allocation) {
      setFormData({
        employee_id: allocation.emp_id,
        project_id: allocation.project_id,
        allocation_percentage: allocation.allocation_percentage.toString(),
        role: allocation.role,
        start_date: allocation.start_date,
        end_date: allocation.end_date || "",
        is_billable: allocation.is_billable,
      });
    }
    setErrors({});
    setIsEditing(false);
  };

  if (loading) return <LoadingPage />;
  if (!allocation) return <div>Allocation not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-semibold">Allocation Details</h1>
              <p className="text-muted-foreground mt-1">
                {allocation.employee_name} - {allocation.project_name}
              </p>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Allocation
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {!isEditing ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Employee
                      </div>
                      <div className="font-medium">
                        {allocation.employee_code} - {allocation.employee_name}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Project
                      </div>
                      <div className="font-medium">
                        {allocation.project_code} - {allocation.project_name}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Allocation Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Allocation %
                      </div>
                      <Badge variant="secondary" className="mt-1">
                        {allocation.allocation_percentage}%
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Role</div>
                      <div className="font-medium mt-1">{allocation.role}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Start Date
                      </div>
                      <div className="font-medium mt-1">
                        {new Date(allocation.start_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        End Date
                      </div>
                      <div className="font-medium mt-1">
                        {allocation.end_date
                          ? new Date(allocation.end_date).toLocaleDateString()
                          : "Ongoing"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Additional Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Billable
                      </div>
                      <Badge
                        variant={allocation.is_billable ? "default" : "outline"}
                        className="mt-1"
                      >
                        {allocation.is_billable ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Edit Allocation</CardTitle>
                <CardDescription>
                  Update allocation details. Employee and project cannot be
                  changed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AllocationFormFields
                  isEdit={true}
                  formData={formData}
                  errors={errors as Record<string, string>}
                  onChange={handleChange}
                  employees={employees}
                  projects={projects}
                  disabled={saving}
                  remainingCapacity={remainingCapacity ?? undefined}
                  showCapacityWarning={showCapacityWarning}
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
